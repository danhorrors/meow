import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { Lead } from '../entities/Lead.js';
import { Account, Reference } from '../entities/Account.js';
import { SchemaType } from '../entities/Schema.js';
import { validateAndFetchLead, validateAndFetchAccount } from '../helpers/EntityFetchHelper.js';
import { InvalidRequestBodyError } from '../errors/InvalidRequestBodyError.js';

const normalizeEmail = (value?: string) => (value ? value.trim().toLowerCase() : '');
const normalizePhone = (value?: string) =>
  value ? value.replace(/[^\d+]/g, '') : '';
const normalizeName = (value?: string) => (value ? value.trim().toLowerCase() : '');

const getAccountMatchKeys = async (teamId: any) => {
  const schema = await EntityHelper.findSchemaByType(teamId, SchemaType.Account);
  const emailKeys = schema?.attributes?.filter((attr) => attr.type === 'email').map((a) => a.key);
  const phoneKeys =
    schema?.attributes
      ?.filter((attr) => attr.type === 'text' && attr.name.toLowerCase().includes('phone'))
      .map((a) => a.key) ?? [];

  return { emailKeys: emailKeys ?? [], phoneKeys };
};

const listLeadDuplicates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const leads = await EntityHelper.findByTeam(Lead, req.jwt.team);
    const leadSchema = await EntityHelper.findSchemaByType(req.jwt.team._id, SchemaType.Lead);
    const emailKeys =
      leadSchema?.attributes?.filter((attr) => attr.type === 'email').map((a) => a.key) ?? [];

    const buckets = new Map<string, Lead[]>();

    const addBucket = (key: string, lead: Lead) => {
      if (!key) {
        return;
      }
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key)!.push(lead);
    };

    leads.forEach((lead) => {
      let email = normalizeEmail(lead.contact?.email);
      if (!email && lead.attributes) {
        emailKeys.forEach((key) => {
          if (!email && lead.attributes?.[key]) {
            email = normalizeEmail(lead.attributes[key] as string);
          }
        });
      }
      const phone = normalizePhone(lead.contact?.phone);
      const name = normalizeName(lead.name);
      const domain = normalizeName(lead.contact?.domain);

      if (email) addBucket(`email:${email}`, lead);
      if (phone) addBucket(`phone:${phone}`, lead);
      if (name && domain) addBucket(`name-domain:${name}:${domain}`, lead);
    });

    const duplicates = Array.from(buckets.entries())
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => ({ key, items: list }));

    return res.json(duplicates);
  } catch (error) {
    return next(error);
  }
};

const listAccountDuplicates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const accounts = await EntityHelper.findByTeam(Account, req.jwt.team);
    const { emailKeys, phoneKeys } = await getAccountMatchKeys(req.jwt.team._id);
    const buckets = new Map<string, Account[]>();

    const addBucket = (key: string, account: Account) => {
      if (!key) {
        return;
      }
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key)!.push(account);
    };

    accounts.forEach((account) => {
      const name = normalizeName(account.name);
      const attributes = account.attributes || {};

      emailKeys.forEach((key) => {
        const value = normalizeEmail(attributes[key] as string | undefined);
        if (value) addBucket(`email:${value}`, account);
      });

      phoneKeys.forEach((key) => {
        const value = normalizePhone(attributes[key] as string | undefined);
        if (value) addBucket(`phone:${value}`, account);
      });

      if (name) {
        addBucket(`name:${name}`, account);
      }
    });

    const duplicates = Array.from(buckets.entries())
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => ({ key, items: list }));

    return res.json(duplicates);
  } catch (error) {
    return next(error);
  }
};

const mergeLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { primaryId, duplicateId, strategy } = req.body;

    if (!primaryId || !duplicateId) {
      throw new InvalidRequestBodyError('primaryId and duplicateId required');
    }

    const primary = await validateAndFetchLead(primaryId, req.jwt.user);
    const duplicate = await validateAndFetchLead(duplicateId, req.jwt.user);

    if (strategy === 'duplicate') {
      primary.name = duplicate.name;
      primary.attributes = { ...(duplicate.attributes || {}), ...(primary.attributes || {}) };
      primary.contact = { ...(duplicate.contact || {}), ...(primary.contact || {}) };
    } else {
      primary.attributes = { ...(primary.attributes || {}), ...(duplicate.attributes || {}) };
      primary.contact = { ...(primary.contact || {}), ...(duplicate.contact || {}) };
    }

    const updated = await EntityHelper.update(primary);
    await EntityHelper.remove(Lead, duplicate);

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const mergeAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { primaryId, duplicateId, strategy } = req.body;

    if (!primaryId || !duplicateId) {
      throw new InvalidRequestBodyError('primaryId and duplicateId required');
    }

    const primary = await validateAndFetchAccount(primaryId, req.jwt.user);
    const duplicate = await validateAndFetchAccount(duplicateId, req.jwt.user);

    if (strategy === 'duplicate') {
      primary.name = duplicate.name;
      primary.attributes = { ...(duplicate.attributes || {}), ...(primary.attributes || {}) };
    } else {
      primary.attributes = { ...(primary.attributes || {}), ...(duplicate.attributes || {}) };
    }

    const references: Reference[] = [];
    const addReference = (reference?: Reference) => {
      if (!reference) {
        return;
      }
      const exists = references.some(
        (ref) =>
          ref._id.toString() === reference._id.toString() &&
          ref.schemaAttributeKey === reference.schemaAttributeKey
      );
      if (!exists) {
        references.push(reference);
      }
    };

    primary.references?.forEach(addReference);
    duplicate.references?.forEach(addReference);
    primary.references = references;

    const updated = await EntityHelper.update(primary);
    await EntityHelper.remove(Account, duplicate);

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

export const DuplicateController = {
  listLeadDuplicates,
  listAccountDuplicates,
  mergeLead,
  mergeAccount,
};
