import { ObjectId } from 'mongodb';
import { Campaign, CampaignCondition, CampaignEntityType, CampaignTemplate } from '../entities/Campaign.js';
import { Lead } from '../entities/Lead.js';
import { Customer } from '../entities/Customer.js';
import { Account } from '../entities/Account.js';
import { Card } from '../entities/Card.js';
import { User } from '../entities/User.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { SchemaHelper } from '../helpers/SchemaHelper.js';
import { SchemaType } from '../entities/Schema.js';
import { EmailService } from './EmailService.js';
import { Team } from '../entities/Team.js';

type Recipient = {
  email: string;
  entityType: CampaignEntityType;
  entityId: ObjectId;
  data: Record<string, string>;
};

const normalize = (value?: string) => (value || '').toLowerCase();

const getValueByPath = (entity: any, field: string): string | undefined => {
  if (!entity || !field) {
    return undefined;
  }

  if (field.startsWith('attributes.')) {
    const key = field.replace('attributes.', '');
    return entity.attributes?.[key]?.toString();
  }

  const parts = field.split('.');
  let current: any = entity;
  for (const part of parts) {
    current = current?.[part];
  }
  return current?.toString?.();
};

const matchesCondition = (entity: any, condition: CampaignCondition): boolean => {
  const value = getValueByPath(entity, condition.field);
  const condValue = condition.value?.toString();
  const val = normalize(value);
  const target = normalize(condValue);

  switch (condition.operator) {
    case 'equals':
      return val === target;
    case 'not_equals':
      return val !== target;
    case 'contains':
      return target.length > 0 && val.includes(target);
    case 'not_contains':
      return target.length > 0 && !val.includes(target);
    case 'exists':
      return Boolean(value && value.length > 0);
    case 'not_exists':
      return !value || value.length === 0;
    default:
      return false;
  }
};

const matchesAudience = (entity: any, conditions: CampaignCondition[], match: 'all' | 'any') => {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  if (match === 'any') {
    return conditions.some((condition) => matchesCondition(entity, condition));
  }

  return conditions.every((condition) => matchesCondition(entity, condition));
};

const getEmailFromAttributes = (attributes: any, schema?: any): string | undefined => {
  if (!attributes) {
    return undefined;
  }

  if (schema?.attributes) {
    const emailAttr = schema.attributes.find(
      (attr: any) =>
        attr.type === 'email' ||
        (attr.name && attr.name.toLowerCase().includes('email'))
    );
    if (emailAttr && attributes[emailAttr.key]) {
      return attributes[emailAttr.key].toString();
    }
  }

  const fallbackKey = Object.keys(attributes).find((key) => key.toLowerCase() === 'email');
  if (fallbackKey) {
    return attributes[fallbackKey]?.toString();
  }

  return undefined;
};

const renderTemplate = (template: CampaignTemplate, data: Record<string, string>) => {
  const replace = (value: string) =>
    value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => data[key] ?? '');

  return {
    subject: replace(template.subject),
    html: replace(template.html),
    text: template.text ? replace(template.text) : undefined,
  };
};

export class CampaignService {
  async buildRecipients(team: Team, campaign: Campaign): Promise<Recipient[]> {
    const audience = campaign.audience;
    const recipients: Recipient[] = [];

    if (audience.entity === 'leads') {
      const leads = await EntityHelper.findByTeam(Lead, team);
      leads.forEach((lead) => {
        if (!matchesAudience(lead, audience.conditions, audience.match)) {
          return;
        }
        const email = lead.contact?.email;
        if (!email) {
          return;
        }
        const attributes = lead.attributes || {};
        const attributeData: Record<string, string> = {};
        Object.keys(attributes).forEach((key) => {
          attributeData[`attributes.${key}`] = attributes[key]?.toString?.() || '';
        });
        recipients.push({
          email,
          entityType: 'leads',
          entityId: lead._id!,
          data: {
            name: lead.name,
            email,
            contactEmail: lead.contact?.email || '',
            contactPhone: lead.contact?.phone || '',
            ...attributeData,
          },
        });
      });
    }

    if (audience.entity === 'customers') {
      const customers = await EntityHelper.findByTeam(Customer, team);
      customers.forEach((customer) => {
        if (!matchesAudience(customer, audience.conditions, audience.match)) {
          return;
        }
        const email = customer.contact?.email;
        if (!email) {
          return;
        }
        const attributes = customer.attributes || {};
        const attributeData: Record<string, string> = {};
        Object.keys(attributes).forEach((key) => {
          attributeData[`attributes.${key}`] = attributes[key]?.toString?.() || '';
        });
        recipients.push({
          email,
          entityType: 'customers',
          entityId: customer._id!,
          data: {
            name: customer.name,
            email,
            contactEmail: customer.contact?.email || '',
            contactPhone: customer.contact?.phone || '',
            ...attributeData,
          },
        });
      });
    }

    if (audience.entity === 'accounts') {
      const accounts = await EntityHelper.findByTeam(Account, team);
      const schema = await EntityHelper.findSchemaByType(team._id, SchemaType.Account);
      accounts.forEach((account) => {
        if (!matchesAudience(account, audience.conditions, audience.match)) {
          return;
        }
        const email = getEmailFromAttributes(account.attributes, schema);
        if (!email) {
          return;
        }
        const attributes = account.attributes || {};
        const attributeData: Record<string, string> = {};
        Object.keys(attributes).forEach((key) => {
          attributeData[`attributes.${key}`] = attributes[key]?.toString?.() || '';
        });
        recipients.push({
          email,
          entityType: 'accounts',
          entityId: account._id!,
          data: {
            name: account.name,
            email,
            ...attributeData,
          },
        });
      });
    }

    if (audience.entity === 'opportunities') {
      const cards = await EntityHelper.findBy(Card, { teamId: { $eq: team._id } });
      const schema = await EntityHelper.findSchemaByType(team._id, SchemaType.Card);
      const references = SchemaHelper.getSchemaReferenceAttributes(schema?.attributes);
      const accountReference = references.find((ref) => ref.entity === SchemaType.Account);
      const accountSchema = await EntityHelper.findSchemaByType(team._id, SchemaType.Account);

      for (const card of cards) {
        if (!matchesAudience(card, audience.conditions, audience.match)) {
          continue;
        }

        let email: string | undefined;
        let name = card.name;
        const attributeData: Record<string, string> = {};
        Object.keys(card.attributes || {}).forEach((key) => {
          attributeData[`attributes.${key}`] = card.attributes?.[key]?.toString?.() || '';
        });
        if (accountReference) {
          const accountId = card.attributes?.[accountReference.key];
          if (accountId) {
            const account = await EntityHelper.findOneById(Account, accountId.toString());
            if (account) {
              email = getEmailFromAttributes(account.attributes, accountSchema);
              name = account.name;
              Object.keys(account.attributes || {}).forEach((key) => {
                attributeData[`account.attributes.${key}`] =
                  account.attributes?.[key]?.toString?.() || '';
              });
            }
          }
        }

        if (!email) {
          continue;
        }

        recipients.push({
          email,
          entityType: 'opportunities',
          entityId: card._id!,
          data: {
            name,
            email,
            opportunityName: card.name,
            ...attributeData,
          },
        });
      }
    }

    if (audience.entity === 'users') {
      const users = await EntityHelper.findByTeam(User, team);
      users.forEach((user) => {
        if (!matchesAudience(user, audience.conditions, audience.match)) {
          return;
        }
        const email = user.name; // no email field in user yet
        if (!email || !email.includes('@')) {
          return;
        }
        recipients.push({
          email,
          entityType: 'users',
          entityId: user._id!,
          data: {
            name: user.name,
            email,
          },
        });
      });
    }

    return recipients;
  }

  async sendCampaign(team: Team, user: User, campaign: Campaign, stepIndex = 0) {
    const recipients = await this.buildRecipients(team, campaign);
    const step =
      campaign.steps && campaign.steps.length > 0
        ? campaign.steps[Math.min(stepIndex, campaign.steps.length - 1)]
        : undefined;
    const template = step?.template || campaign.template;

    const service = new EmailService();

    for (const recipient of recipients) {
      const rendered = renderTemplate(template, recipient.data);
      await service.send(team, user, {
        to: [recipient.email],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        provider: 'mailgun',
        entityType: recipient.entityType === 'opportunities' ? 'opportunity' : (recipient.entityType as any),
        entityId: recipient.entityId.toString(),
        campaignId: campaign._id?.toString(),
      });
    }
  }
}
