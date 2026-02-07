import { google } from 'googleapis';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { InvalidConfigurationError } from '../errors/InvalidConfigurationError.js';
import { Team } from '../entities/Team.js';
import { User } from '../entities/User.js';
import { EmailLog, NewEmailLog } from '../entities/EmailLog.js';
import { Lead } from '../entities/Lead.js';
import { Customer } from '../entities/Customer.js';
import { Account } from '../entities/Account.js';

const parseEmailList = (value?: string): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .map((part) => {
      const match = part.match(/<([^>]+)>/);
      return (match ? match[1] : part).trim();
    })
    .filter(Boolean);
};

const decodeBody = (data?: string) => {
  if (!data) return '';
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
};

const findHeader = (headers: { name?: string; value?: string }[], name: string) => {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value;
};

const findBodyParts = (part: any) => {
  const result: { html?: string; text?: string } = {};
  if (!part) return result;

  if (part.mimeType === 'text/html' && part.body?.data) {
    result.html = decodeBody(part.body.data);
  }
  if (part.mimeType === 'text/plain' && part.body?.data) {
    result.text = decodeBody(part.body.data);
  }

  if (part.parts) {
    for (const child of part.parts) {
      const childResult = findBodyParts(child);
      result.html = result.html || childResult.html;
      result.text = result.text || childResult.text;
    }
  }

  return result;
};

const getGmailConfig = (team: Team, user: User) => {
  const teamIntegration = team.integrations?.find((item) => item.key === 'google_workspace');
  const teamAttrs = teamIntegration?.attributes || {};
  const clientId = teamAttrs.clientId as string | undefined;
  const clientSecret = teamAttrs.clientSecret as string | undefined;
  const redirectUri = teamAttrs.redirectUri as string | undefined;

  const userIntegration = user.integrations?.find((item) => item.key === 'google_workspace');
  const userAttrs = userIntegration?.attributes || {};
  const refreshToken = userAttrs.refreshToken as string | undefined;
  const email = userAttrs.email as string | undefined;
  const lastSyncAt = userAttrs.lastSyncAt as string | undefined;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new InvalidConfigurationError('Google Workspace is not configured.');
  }

  if (!refreshToken || !email) {
    throw new InvalidConfigurationError('Google Workspace is not connected for this user.');
  }

  return { clientId, clientSecret, redirectUri, refreshToken, fromEmail: email, lastSyncAt };
};

const findEntityForEmail = async (team: Team, email: string) => {
  const lead = await EntityHelper.findOneBy(Lead, {
    teamId: { $eq: team._id },
    'contact.email': { $eq: email },
  });
  if (lead) {
    return { type: 'lead' as const, id: lead._id };
  }

  const customer = await EntityHelper.findOneBy(Customer, {
    teamId: { $eq: team._id },
    'contact.email': { $eq: email },
  });
  if (customer) {
    return { type: 'customer' as const, id: customer._id };
  }

  const accounts = await EntityHelper.findByTeam(Account, team);
  const account = accounts.find((item) => {
    const attributes = item.attributes || {};
    const emailKey = Object.keys(attributes).find((key) => key.toLowerCase() === 'email');
    return emailKey ? attributes[emailKey] === email : false;
  });
  if (account) {
    return { type: 'account' as const, id: account._id };
  }

  return undefined;
};

export class GmailSyncService {
  async syncInbox(team: Team, user: User, limit = 50) {
    const config = getGmailConfig(team, user);

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    oauth2Client.setCredentials({ refresh_token: config.refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const after = config.lastSyncAt ? Math.floor(new Date(config.lastSyncAt).getTime() / 1000) : null;
    const q = after ? `in:inbox after:${after}` : 'in:inbox';

    const list = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults: Math.min(limit, 100),
    });

    const messages = list.data.messages || [];
    const created: EmailLog[] = [];

    for (const message of messages) {
      if (!message.id) continue;

      const existing = await EntityHelper.findOneBy(EmailLog, {
        teamId: { $eq: team._id },
        externalId: { $eq: message.id },
      });
      if (existing) {
        continue;
      }

      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const payload = detail.data.payload;
      const headers = payload?.headers || [];
      const from = findHeader(headers, 'From') || '';
      const to = parseEmailList(findHeader(headers, 'To'));
      const subject = findHeader(headers, 'Subject') || '(no subject)';
      const dateHeader = findHeader(headers, 'Date');
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date();
      const body = findBodyParts(payload);

      const fromEmails = parseEmailList(from);
      const sender = fromEmails[0] || from;
      const entityMatch = sender ? await findEntityForEmail(team, sender) : undefined;

      const log = new NewEmailLog(team, user, 'gmail', to, subject);
      log.status = 'received';
      log.direction = 'inbound';
      log.from = sender;
      log.receivedAt = receivedAt;
      log.externalId = message.id;
      if (body.html) {
        log.html = body.html;
      }
      if (body.text) {
        log.text = body.text;
      }
      if (entityMatch) {
        log.entityType = entityMatch.type;
        log.entityId = entityMatch.id;
      }

      const saved = await EntityHelper.create(log, EmailLog);
      created.push(saved);
    }

    user.integrations = (user.integrations || []).map((integration) => {
      if (integration.key !== 'google_workspace') {
        return integration;
      }
      return {
        ...integration,
        attributes: {
          ...(integration.attributes || {}),
          lastSyncAt: new Date().toISOString(),
        },
      };
    });
    await EntityHelper.update(user);

    return created;
  }
}
