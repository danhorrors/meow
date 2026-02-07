export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
export type CampaignEntityType = 'leads' | 'customers' | 'accounts' | 'opportunities' | 'users';
export type CampaignAudienceMatch = 'all' | 'any';

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
  sendAt?: string;
  timeZone?: string;
  recurring?: {
    interval: 'daily' | 'weekly';
  };
}

export interface Campaign {
  _id?: string;
  name: string;
  status?: CampaignStatus;
  audience: CampaignAudience;
  template: CampaignTemplate;
  steps?: CampaignStep[];
  schedule?: CampaignSchedule;
  nextSendAt?: string | null;
  stepIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}
