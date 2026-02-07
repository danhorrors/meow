import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { EmailService } from '../services/EmailService.js';
import { EmailLog } from '../entities/EmailLog.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { GmailSyncService } from '../services/GmailSyncService.js';
import { ObjectId } from 'mongodb';

const send = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const log = await new EmailService().send(req.jwt.team, req.jwt.user, {
      to: req.body.to,
      subject: req.body.subject,
      html: req.body.html,
      text: req.body.text,
      provider: req.body.provider || 'gmail',
      entityType: req.body.entityType,
      entityId: req.body.entityId,
      campaignId: req.body.campaignId,
    });

    return res.status(201).json(log);
  } catch (error) {
    return next(error);
  }
};

const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query: any = {
      teamId: { $eq: req.jwt.team._id },
    };

    if (req.query.entityType && req.query.entityId) {
      query.entityType = req.query.entityType;
      query.entityId = new ObjectId(req.query.entityId.toString());
    }

    if (req.query.campaignId) {
      query.campaignId = new ObjectId(req.query.campaignId.toString());
    }

    const emails = await EntityHelper.findBy(EmailLog, query, { createdAt: -1 });

    return res.json(emails);
  } catch (error) {
    return next(error);
  }
};

const sync = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit = req.body?.limit ? parseInt(req.body.limit) : 50;
    const created = await new GmailSyncService().syncInbox(req.jwt.team, req.jwt.user, limit);
    return res.json({ created: created.length, emails: created });
  } catch (error) {
    return next(error);
  }
};

export const EmailController = {
  send,
  list,
  sync,
};
