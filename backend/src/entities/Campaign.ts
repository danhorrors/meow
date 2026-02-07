import { Entity } from '../helpers/EntityDecorator.js';
import { ExistingEntity, NewEntity } from './BaseEntity.js';
import { ObjectId } from 'mongodb';
import { Team } from './Team.js';
import { User } from './User.js';

export type CampaignAudienceMatch = 'all' | 'any';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
export type CampaignEntityType = 'leads' | 'customers' | 'accounts' | 'opportunities' | 'users';

export interface CampaignCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
  value?: string;
}

export interface CampaignAudience {
  entity: CampaignEntityType;
  match: CampaignAudienceMatch;
  conditions: CampaignCondition[];
}

export interface CampaignTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface CampaignStep {
  name: string;
  delayDays: number;
  template: CampaignTemplate;
}

export interface CampaignSchedule {
  sendAt?: Date;
  timeZone?: string;
  recurring?: {
    interval: 'daily' | 'weekly';
  };
}

@Entity({ name: 'Campaigns' })
export class Campaign implements ExistingEntity {
  _id: ObjectId;
  teamId: ObjectId;
  userId: ObjectId;
  name: string;
  status: CampaignStatus;
  audience: CampaignAudience;
  template: CampaignTemplate;
  steps?: CampaignStep[];
  schedule?: CampaignSchedule;
  nextSendAt?: Date | null;
  stepIndex?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    _id: ObjectId,
    teamId: ObjectId,
    userId: ObjectId,
    name: string,
    status: CampaignStatus,
    audience: CampaignAudience,
    template: CampaignTemplate,
    createdAt: Date,
    updatedAt: Date
  ) {
    this._id = _id;
    this.teamId = teamId;
    this.userId = userId;
    this.name = name;
    this.status = status;
    this.audience = audience;
    this.template = template;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

@Entity({ name: 'Campaigns' })
export class NewCampaign implements NewEntity {
  teamId: ObjectId;
  userId: ObjectId;
  name: string;
  status: CampaignStatus;
  audience: CampaignAudience;
  template: CampaignTemplate;
  steps?: CampaignStep[];
  schedule?: CampaignSchedule;
  nextSendAt?: Date | null;
  stepIndex?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    team: Team,
    user: User,
    name: string,
    audience: CampaignAudience,
    template: CampaignTemplate
  ) {
    this.teamId = team._id;
    this.userId = user._id!;
    this.name = name;
    this.status = 'draft';
    this.audience = audience;
    this.template = template;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
