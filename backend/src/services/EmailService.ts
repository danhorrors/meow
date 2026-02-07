import { EntityHelper } from '../helpers/EntityHelper.js';
import { Team } from '../entities/Team.js';
import { User } from '../entities/User.js';
import { NewEmailLog, EmailLog, EmailProvider, EmailEntityType } from '../entities/EmailLog.js';
import { MailgunService } from './MailgunService.js';
import { GmailService } from './GmailService.js';
import { ObjectId } from 'mongodb';
import { InvalidConfigurationError } from '../errors/InvalidConfigurationError.js';

export interface SendEmailPayload {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  provider: EmailProvider;
  entityType?: EmailEntityType;
  entityId?: string;
  campaignId?: string;
}

const getMailgunConfig = (team: Team) => {
  const integration = team.integrations?.find((item) => item.key === 'mailgun');
  const attrs = integration?.attributes || {};
  const apiKey = attrs.apiKey as string | undefined;
  const domain = attrs.domain as string | undefined;
  const sender = attrs.sender as string | undefined;
  const region = (attrs.region as string | undefined) || 'us';

  if (!apiKey || !domain || !sender) {
    throw new InvalidConfigurationError('Mailgun integration is not configured.');
  }

  return { apiKey, domain, sender, region: region === 'eu' ? 'eu' : 'us' } as const;
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

  if (!clientId || !clientSecret || !redirectUri) {
    throw new InvalidConfigurationError('Google Workspace is not configured.');
  }

  if (!refreshToken || !email) {
    throw new InvalidConfigurationError('Google Workspace is not connected for this user.');
  }

  return { clientId, clientSecret, redirectUri, refreshToken, fromEmail: email };
};

export class EmailService {
  async send(team: Team, user: User, payload: SendEmailPayload): Promise<EmailLog> {
    const log = new NewEmailLog(team, user, payload.provider, payload.to, payload.subject);
    log.direction = 'outbound';

    if (payload.html) {
      log.html = payload.html;
    }
    if (payload.text) {
      log.text = payload.text;
    }
    if (payload.entityType) {
      log.entityType = payload.entityType;
    }
    if (payload.entityId) {
      log.entityId = new ObjectId(payload.entityId);
    }
    if (payload.campaignId) {
      log.campaignId = new ObjectId(payload.campaignId);
    }

    let saved = await EntityHelper.create(log, EmailLog);

    try {
      if (payload.provider === 'gmail') {
        const config = getGmailConfig(team, user);
        saved.from = config.fromEmail;
        await EntityHelper.update(saved);
        await new GmailService().send(config, payload);
      } else {
        const config = getMailgunConfig(team);
        saved.from = config.sender;
        await EntityHelper.update(saved);
        await new MailgunService().send(config, payload);
      }

      saved.status = 'sent';
      saved.sentAt = new Date();
      saved.updatedAt = new Date();
      saved = await EntityHelper.update(saved);
    } catch (error: any) {
      saved.status = 'failed';
      saved.error = error?.message || error?.toString?.() || 'Failed to send';
      saved.updatedAt = new Date();
      saved = await EntityHelper.update(saved);
      throw error;
    }

    return saved;
  }
}
