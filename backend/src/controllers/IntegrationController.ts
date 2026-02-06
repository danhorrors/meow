import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { InvalidConfigurationError } from '../errors/InvalidConfigurationError.js';
import { Team } from '../entities/Team.js';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';

const GOOGLE_INTEGRATION_KEY = 'google_calendar';
const GOOGLE_SCOPE = ['https://www.googleapis.com/auth/calendar.events'];

const getGoogleCalendarAuthUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const integration = req.jwt.team.integrations?.find(
      (item) => item.key === GOOGLE_INTEGRATION_KEY
    );

    if (!integration) {
      throw new InvalidConfigurationError('Google Calendar integration not configured.');
    }

    const attrs = integration.attributes || {};
    const clientId = attrs.clientId as string | undefined;
    const clientSecret = attrs.clientSecret as string | undefined;
    const redirectUri = attrs.redirectUri as string | undefined;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new InvalidConfigurationError('Google Calendar credentials are missing.');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const state = jwt.sign(
      { teamId: req.jwt.team._id?.toString() },
      process.env.SESSION_SECRET!,
      { expiresIn: '10m' }
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPE,
      state,
    });

    return res.json({ url });
  } catch (error) {
    return next(error);
  }
};

const googleCalendarCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code?.toString();
    const state = req.query.state?.toString();

    if (!code || !state) {
      throw new InvalidConfigurationError('Missing OAuth callback parameters.');
    }

    const payload = jwt.verify(state, process.env.SESSION_SECRET!) as { teamId?: string };

    if (!payload.teamId) {
      throw new InvalidConfigurationError('Invalid OAuth callback state.');
    }

    const team = await EntityHelper.findOneById(Team, payload.teamId);

    if (!team) {
      throw new InvalidConfigurationError('Team not found.');
    }

    const integration = team.integrations?.find(
      (item) => item.key === GOOGLE_INTEGRATION_KEY
    );

    if (!integration) {
      throw new InvalidConfigurationError('Google Calendar integration not configured.');
    }

    const attrs = integration.attributes || {};
    const clientId = attrs.clientId as string | undefined;
    const clientSecret = attrs.clientSecret as string | undefined;
    const redirectUri = attrs.redirectUri as string | undefined;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new InvalidConfigurationError('Google Calendar credentials are missing.');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const tokens = await oauth2Client.getToken(code);

    if (tokens.tokens.refresh_token) {
      attrs.refreshToken = tokens.tokens.refresh_token;
      integration.attributes = attrs;
      team.integrations = [
        ...(team.integrations || []).filter((item) => item.key !== GOOGLE_INTEGRATION_KEY),
        integration,
      ];
      await EntityHelper.update(team);
    }

    return res
      .status(200)
      .send(
        '<html><body style="font-family: sans-serif;">Google Calendar connected. You can close this window.</body></html>'
      );
  } catch (error) {
    return next(error);
  }
};

export const IntegrationController = {
  getGoogleCalendarAuthUrl,
  googleCalendarCallback,
};
