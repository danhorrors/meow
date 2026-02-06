import { Response, NextFunction } from 'express';
import { Account, NewAccount } from '../entities/Account.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { EventHelper } from '../helpers/EventHelper.js';
import { validateAndFetchAccount, validateAndFetchUser } from '../helpers/EntityFetchHelper.js';
import { PermissionHelper } from '../helpers/PermissionHelper.js';

const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let userId = req.jwt.user._id!;

    if (req.body.userId) {
      await PermissionHelper.ensurePermission(req.jwt.user, 'accounts', 'assign');
      userId = (await validateAndFetchUser(req.body.userId, req.jwt.user))._id!;
    }

    const account = new NewAccount(req.jwt.team, req.body.name, userId);

    if (req.body.attributes) {
      account.attributes = req.body.attributes;
    }

    const latest = await EntityHelper.create(account, Account);

    EventHelper.get().emit('account', { user: req.jwt.user, latest: latest.toPlain() });

    return res.status(201).json(latest);
  } catch (error) {
    return next(error);
  }
};

const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let account = await validateAndFetchAccount(req.params.id, req.jwt.user);

    const previous = account.toPlain();

    account.name = req.body.name;

    if (req.body.userId && account.userId.toString() !== req.body.userId.toString()) {
      await PermissionHelper.ensurePermission(req.jwt.user, 'accounts', 'assign');
      const user = await validateAndFetchUser(req.body.userId, req.jwt.user);
      account.userId = user._id!;
    }

    if (req.body.attributes) {
      account.attributes = req.body.attributes;
    }

    const latest = await EntityHelper.update(account);

    // TODO rename account to original
    EventHelper.get().emit('account', {
      user: req.jwt.user,
      latest: latest.toPlain(),
      previous: previous,
    });

    return res.json(latest);
  } catch (error) {
    return next(error);
  }
};

const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const accounts = await EntityHelper.findByTeam(Account, req.jwt.team);

    return res.json(accounts);
  } catch (error) {
    return next(error);
  }
};

const fetch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const account = await validateAndFetchAccount(req.params.id, req.jwt.user);

    return res.json(account);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const account = await validateAndFetchAccount(req.params.id, req.jwt.user);

    await EntityHelper.remove(Account, account);

    return res.json(account.toPlain());
  } catch (error) {
    return next(error);
  }
};

export const AccountController = {
  update,
  create,
  list,
  fetch,
  remove,
};
