export type EmailProvider = 'mailgun' | 'gmail';
export type EmailStatus = 'queued' | 'sent' | 'failed' | 'received';
export type EmailDirection = 'outbound' | 'inbound';

export interface EmailLog {
  _id: string;
  provider: EmailProvider;
  status: EmailStatus;
  direction?: EmailDirection;
  from?: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  entityType?: string;
  entityId?: string;
  campaignId?: string;
  sentAt?: string;
  receivedAt?: string;
  externalId?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}
