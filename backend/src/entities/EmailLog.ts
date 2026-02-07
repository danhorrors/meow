import { Entity } from '../helpers/EntityDecorator.js';
import { ExistingEntity, NewEntity } from './BaseEntity.js';
import { ObjectId } from 'mongodb';
import { Team } from './Team.js';
import { User } from './User.js';

export type EmailProvider = 'mailgun' | 'gmail';
export type EmailStatus = 'queued' | 'sent' | 'failed' | 'received';
export type EmailEntityType = 'lead' | 'customer' | 'account' | 'opportunity' | 'user' | 'campaign';
export type EmailDirection = 'outbound' | 'inbound';

@Entity({ name: 'Emails' })
export class EmailLog implements ExistingEntity {
  _id: ObjectId;
  teamId: ObjectId;
  userId: ObjectId;
  provider: EmailProvider;
  status: EmailStatus;
  direction: EmailDirection;
  from?: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  entityType?: EmailEntityType;
  entityId?: ObjectId;
  campaignId?: ObjectId;
  sentAt?: Date;
  receivedAt?: Date;
  externalId?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    _id: ObjectId,
    teamId: ObjectId,
    userId: ObjectId,
    provider: EmailProvider,
    status: EmailStatus,
    direction: EmailDirection,
    to: string[],
    subject: string,
    createdAt: Date,
    updatedAt: Date
  ) {
    this._id = _id;
    this.teamId = teamId;
    this.userId = userId;
    this.provider = provider;
    this.status = status;
    this.direction = direction;
    this.to = to;
    this.subject = subject;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

@Entity({ name: 'Emails' })
export class NewEmailLog implements NewEntity {
  teamId: ObjectId;
  userId: ObjectId;
  provider: EmailProvider;
  status: EmailStatus;
  direction: EmailDirection;
  from?: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  entityType?: EmailEntityType;
  entityId?: ObjectId;
  campaignId?: ObjectId;
  sentAt?: Date;
  receivedAt?: Date;
  externalId?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(team: Team, user: User, provider: EmailProvider, to: string[], subject: string) {
    this.teamId = team._id;
    this.userId = user._id!;
    this.provider = provider;
    this.status = 'queued';
    this.direction = 'outbound';
    this.to = to;
    this.subject = subject;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
