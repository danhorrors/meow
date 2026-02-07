import { Response, NextFunction } from 'express';
import { DateTime } from 'luxon';
import { Campaign, NewCampaign } from '../entities/Campaign.js';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { EntityNotFoundError } from '../errors/EntityNotFoundError.js';
import { CampaignService } from '../services/CampaignService.js';

const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaigns = await EntityHelper.findByTeam(Campaign, req.jwt.team);
    return res.json(campaigns);
  } catch (error) {
    return next(error);
  }
};

const fetch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await EntityHelper.findOneById(Campaign, req.params.id);
    if (!campaign || !EntityHelper.isEntityOwnedBy(campaign, req.jwt.user)) {
      throw new EntityNotFoundError();
    }

    return res.json(campaign);
  } catch (error) {
    return next(error);
  }
};

const createOrUpdate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.body._id) {
      const existing = await EntityHelper.findOneById(Campaign, req.body._id);
      if (!existing || !EntityHelper.isEntityOwnedBy(existing, req.jwt.user)) {
        throw new EntityNotFoundError();
      }

      existing.name = req.body.name;
      existing.audience = req.body.audience;
      existing.template = req.body.template;
      existing.steps = req.body.steps || [];
      existing.schedule = req.body.schedule;
      existing.updatedAt = new Date();

      const updated = await EntityHelper.update(existing);
      return res.json(updated);
    }

    const campaign = new NewCampaign(
      req.jwt.team,
      req.jwt.user,
      req.body.name,
      req.body.audience,
      req.body.template
    );
    campaign.steps = req.body.steps || [];
    campaign.schedule = req.body.schedule;

    const created = await EntityHelper.create(campaign, Campaign);
    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await EntityHelper.findOneById(Campaign, req.params.id);
    if (!campaign || !EntityHelper.isEntityOwnedBy(campaign, req.jwt.user)) {
      throw new EntityNotFoundError();
    }

    await EntityHelper.remove(Campaign, campaign);
    return res.json(campaign);
  } catch (error) {
    return next(error);
  }
};

const schedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await EntityHelper.findOneById(Campaign, req.params.id);
    if (!campaign || !EntityHelper.isEntityOwnedBy(campaign, req.jwt.user)) {
      throw new EntityNotFoundError();
    }

    const sendAt = req.body.sendAt ? DateTime.fromISO(req.body.sendAt) : DateTime.utc();
    const timeZone = req.body.timeZone || 'UTC';

    const base = sendAt.isValid ? sendAt.setZone(timeZone) : DateTime.utc();
    const delayDays = campaign.steps && campaign.steps.length > 0 ? campaign.steps[0].delayDays : 0;
    campaign.nextSendAt = base.plus({ days: delayDays }).toJSDate();
    campaign.stepIndex = 0;
    campaign.status = 'scheduled';
    campaign.schedule = {
      sendAt: base.toJSDate(),
      timeZone,
      recurring: req.body.recurring,
    };
    campaign.updatedAt = new Date();

    const updated = await EntityHelper.update(campaign);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const sendNow = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await EntityHelper.findOneById(Campaign, req.params.id);
    if (!campaign || !EntityHelper.isEntityOwnedBy(campaign, req.jwt.user)) {
      throw new EntityNotFoundError();
    }

    await new CampaignService().sendCampaign(req.jwt.team, req.jwt.user, campaign, 0);

    campaign.status = 'completed';
    campaign.updatedAt = new Date();
    await EntityHelper.update(campaign);

    return res.json({ sent: true });
  } catch (error) {
    return next(error);
  }
};

export const CampaignController = {
  list,
  fetch,
  createOrUpdate,
  remove,
  schedule,
  sendNow,
};
