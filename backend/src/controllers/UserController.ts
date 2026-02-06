import { Response, NextFunction } from 'express';
import { PasswordAuthenticationProvider } from '../authentication/PasswordAuthenticationProvider.js';
import { NewUser, User, UserAuthentication, UserStatus } from '../entities/User.js';
import { InvalidRequestBodyError } from '../errors/InvalidRequestBodyError.js';
import { InvalidUserPropertyError } from '../errors/InvalidUserPropertyError.js';
import { UserInvalidError } from '../errors/UserInvalidError.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { isValidName, isValidPassword } from './RegisterControllerValidator.js';
import { EntityNotFoundError } from '../errors/EntityNotFoundError.js';
import { validateAndFetchUser } from '../helpers/EntityFetchHelper.js';
import { PermissionHelper } from '../helpers/PermissionHelper.js';

function parseUserStatus(value: unknown): UserStatus {
  switch (value) {
    case 'enabled':
      return UserStatus.Enabled;
    case 'disabled':
      return UserStatus.Disabled;
    case 'deleted':
      return UserStatus.Deleted;
    case 'single-sign-on':
      return UserStatus.SingleSignOn;
    default:
      throw new InvalidUserPropertyError(`Unsupported value: ${value}`);
  }
}

function generateInviteCode(length: number): string {
  const characters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  return code;
}
const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await EntityHelper.findByTeam(User, req.jwt.team);

    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await validateAndFetchUser(req.params.id, req.jwt.user);

    await PermissionHelper.ensurePermissionOrSelf(req.jwt.user, user._id.toString(), 'users', 'edit');

    if (req.body.animal) {
      user.animal = req.body.animal.toString();
    }

    if (req.body.color) {
      user.color = req.body.color.toString();
    }

    if (req.body.status) {
      if (user._id === req.jwt.user._id) {
        throw new InvalidRequestBodyError();
      }

      await PermissionHelper.ensurePermission(req.jwt.user, 'users', 'edit');

      user.status = parseUserStatus(req.body.status);

      if (user.status === UserStatus.Deleted) {
        user.authentication = null;
        user.invite = null;
      }
    }

    if (req.body.roleId && req.body.roleId.toString() !== user.roleId?.toString()) {
      await PermissionHelper.ensurePermission(req.jwt.user, 'users', 'assign');
      user.roleId = req.body.roleId;
    }

    const updated = await EntityHelper.update(user);

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const board = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await validateAndFetchUser(req.params.id, req.jwt.user);

    user.board = req.body;

    await EntityHelper.update(user);

    return res.json({ done: true });
  } catch (error) {
    return next(error);
  }
};

const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await isValidName(req.body.name);

    const user = new NewUser(req.jwt.team, req.body.name, UserStatus.Invited);

    user.invite = generateInviteCode(8);

    const defaultRole = await EntityHelper.findDefaultRole(req.jwt.team._id);
    if (defaultRole) {
      user.roleId = defaultRole._id;
    }

    const updated = await EntityHelper.create(user, User);

    res.status(201).json(updated);
  } catch (error) {
    return next(error);
  }
};

const flags = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = await validateAndFetchUser(req.params.id, req.jwt.user);

  /* for now you can only request flags for your own users */
  if (req.jwt.user._id.toString() !== user._id.toString()) {
    throw new EntityNotFoundError();
  }

  return res.json(user.flags ? user.flags : {});
};

const views = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await validateAndFetchUser(req.params.id, req.jwt.user);

    await PermissionHelper.ensurePermissionOrSelf(
      req.jwt.user,
      user._id.toString(),
      'settings',
      'edit'
    );

    const { name, label, view } = req.body;

    if (!user.views) {
      user.views = {};
    }

    if (!user.views[name]) {
      user.views[name] = {};
    }

    user.views[name][label] = view;

    const updated = await EntityHelper.update(user);

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const viewsList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await validateAndFetchUser(req.params.id, req.jwt.user);

    await PermissionHelper.ensurePermissionOrSelf(
      req.jwt.user,
      user._id.toString(),
      'settings',
      'read'
    );

    return res.json(user.views ? user.views : {});
  } catch (error) {
    return next(error);
  }
};

const password = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await validateAndFetchUser(req.params.id, req.jwt.user);

    if (!user.authentication?.local) {
      return res.status(401).end();
    }

    if (user._id.toString() !== req.jwt.user._id.toString()) {
      throw new UserInvalidError();
    }

    const isValidExistingPassword = await new PasswordAuthenticationProvider().authenticate(
      user,
      req.body.existing
    );

    if (!isValidExistingPassword) {
      return res.status(401).end();
    }

    await isValidPassword(req.body.updated);

    const authentication: UserAuthentication = {
      local: {
        password: await new PasswordAuthenticationProvider().create(req.body.updated),
      },
    };

    user.authentication = authentication;

    const updated = await EntityHelper.update(user);

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

export const UserController = {
  list,
  create,
  flags,
  views,
  viewsList,
  update,
  board,
  password,
};
