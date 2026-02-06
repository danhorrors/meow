import { Response, NextFunction } from 'express';
import { DateTime } from 'luxon';
import { google } from 'googleapis';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { NewLead, Lead } from '../entities/Lead.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { validateAndFetchLead } from '../helpers/EntityFetchHelper.js';
import { InvalidConfigurationError } from '../errors/InvalidConfigurationError.js';
import { Account, NewAccount } from '../entities/Account.js';
import { Card, NewCard } from '../entities/Card.js';
import { Lane, LaneType } from '../entities/Lane.js';
import { SchemaType } from '../entities/Schema.js';
import { SchemaHelper } from '../helpers/SchemaHelper.js';
import { emitBoardEvent, emitCardEvent, emitLaneEvent } from '../helpers/EventHelper.js';
import { log } from '../worker.js';
import { User } from '../entities/User.js';
import { validateAndFetchUser } from '../helpers/EntityFetchHelper.js';
import { PermissionHelper } from '../helpers/PermissionHelper.js';

const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let userId = req.jwt.user._id!;

    if (req.body.userId) {
      await PermissionHelper.ensurePermission(req.jwt.user, 'leads', 'assign');
      userId = (await validateAndFetchUser(req.body.userId, req.jwt.user))._id!;
    }

    const lead = new NewLead(req.jwt.team, userId, req.body.name, req.body.attributes);

    if (req.body.contact) {
      lead.contact = { ...req.body.contact };
      if (lead.contact?.email && !lead.contact.domain) {
        const domain = lead.contact.email.split('@')[1];
        if (domain) {
          lead.contact.domain = domain.toLowerCase();
        }
      }
    }

    const latest = await EntityHelper.create(lead, Lead);

    return res.status(201).json(latest);
  } catch (error) {
    return next(error);
  }
};

const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lead = await validateAndFetchLead(req.params.id, req.jwt.user);

    lead.name = req.body.name;

    if (req.body.attributes) {
      lead.attributes = req.body.attributes;
    }

    if (req.body.contact) {
      lead.contact = { ...req.body.contact };
      if (lead.contact?.email && !lead.contact.domain) {
        const domain = lead.contact.email.split('@')[1];
        if (domain) {
          lead.contact.domain = domain.toLowerCase();
        }
      }
    }

    if (req.body.userId && lead.userId.toString() !== req.body.userId.toString()) {
      await PermissionHelper.ensurePermission(req.jwt.user, 'leads', 'assign');
      const user = await validateAndFetchUser(req.body.userId, req.jwt.user);
      lead.userId = user._id!;
    }

    const updated = await EntityHelper.update(lead);

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const leads = await EntityHelper.findByTeam(Lead, req.jwt.team);

    return res.json(leads);
  } catch (error) {
    return next(error);
  }
};

const fetch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lead = await validateAndFetchLead(req.params.id, req.jwt.user);

    await PermissionHelper.ensurePermission(req.jwt.user, 'accounts', 'add');
    await PermissionHelper.ensurePermission(req.jwt.user, 'opportunities', 'add');

    return res.json(lead);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lead = await validateAndFetchLead(req.params.id, req.jwt.user);

    await EntityHelper.remove(Lead, lead);

    return res.json(lead.toPlain());
  } catch (error) {
    return next(error);
  }
};

const getGoogleIntegration = (req: AuthenticatedRequest) => {
  const integration = req.jwt.team.integrations?.find(
    (item) => item.key === 'google_calendar'
  );

  if (!integration) {
    throw new InvalidConfigurationError('Google Calendar integration not configured.');
  }

  return integration;
};

const bookMeeting = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lead = await validateAndFetchLead(req.params.id, req.jwt.user);

    const integration = getGoogleIntegration(req);
    const attrs = integration.attributes || {};

    const clientId = attrs.clientId as string | undefined;
    const clientSecret = attrs.clientSecret as string | undefined;
    const redirectUri = attrs.redirectUri as string | undefined;
    const refreshToken = attrs.refreshToken as string | undefined;
    const calendarId = (attrs.calendarId as string | undefined) || 'primary';

    if (!clientId || !clientSecret || !redirectUri) {
      throw new InvalidConfigurationError('Google Calendar credentials are missing.');
    }

    if (!refreshToken) {
      throw new InvalidConfigurationError('Google Calendar is not connected yet.');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const timeZone = (req.body.timeZone as string | undefined) || 'UTC';
    const startAt = DateTime.fromISO(req.body.startAt, { zone: timeZone });

    if (!startAt.isValid) {
      throw new InvalidConfigurationError('Invalid start date/time.');
    }

    const durationMinutes = parseInt(req.body.durationMinutes);
    const endAt = startAt.plus({ minutes: durationMinutes });

    const attendees = Array.isArray(req.body.attendees)
      ? req.body.attendees.map((email: string) => ({ email }))
      : undefined;

    const summary = req.body.summary || `Meeting: ${lead.name}`;

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description: req.body.description,
        start: {
          dateTime: startAt.toISO(),
          timeZone,
        },
        end: {
          dateTime: endAt.toISO(),
          timeZone,
        },
        attendees,
      },
    });

    /* convert lead -> account + opportunity */
    const account = new NewAccount(req.jwt.team, lead.name, lead.userId, lead.attributes);
    const createdAccount = await EntityHelper.create(account, Account);

    const lanes = await EntityHelper.findBy(
      Lane,
      { teamId: req.jwt.team._id, 'tags.type': LaneType.Normal },
      { index: 1 }
    );

    const lane = lanes[0];
    if (!lane) {
      throw new InvalidConfigurationError('No opportunity lane available.');
    }

    const amount = typeof lead.attributes?.amount === 'number' ? lead.attributes.amount : 1;

    let assignedUser = req.jwt.user;

    if (lead.userId) {
      const user = await EntityHelper.findOneById(User, lead.userId);
      if (user) {
        assignedUser = user;
      }
    }

    const card = new NewCard(assignedUser, lane, lead.name, amount);

    const schema = await EntityHelper.findSchemaByType(req.jwt.team._id, SchemaType.Card);
    const references = SchemaHelper.getSchemaReferenceAttributes(schema?.attributes);
    const accountReference = references.find((ref) => ref.entity === SchemaType.Account);

    if (accountReference) {
      card.attributes = {
        ...(card.attributes || {}),
        [accountReference.key]: createdAccount._id.toString(),
      };
    }

    const createdCard = await EntityHelper.create(card, Card);

    emitCardEvent(req.jwt.user, createdCard!.toPlain());
    emitLaneEvent(card.laneId, card.userId);
    emitBoardEvent(lane.boardId, card.userId);

    await EntityHelper.remove(Lead, lead);

    return res.json({
      eventId: event.data?.id,
      account: createdAccount,
      card: createdCard,
      lead: lead.toPlain(),
    });
  } catch (error) {
    log.error(error);
    return next(error);
  }
};

export const LeadController = {
  update,
  create,
  list,
  fetch,
  remove,
  bookMeeting,
};
