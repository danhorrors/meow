import { Response, NextFunction } from 'express';
import { Role, NewRole } from '../entities/Role.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { InvalidRequestError } from '../errors/InvalidRequestError.js';

const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await EntityHelper.findByTeam(Role, req.jwt.team);
    return res.json(roles);
  } catch (error) {
    return next(error);
  }
};

const createOrUpdate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, permissions, isDefault, _id } = req.body;

    if (_id) {
      const role = await EntityHelper.findOneById(Role, _id);

      if (!role || !EntityHelper.isEntityOwnedBy(role, req.jwt.user)) {
        throw new InvalidRequestError();
      }

      if (role.isDefault && isDefault === false) {
        const defaultRole = await EntityHelper.findDefaultRole(req.jwt.team._id);
        if (defaultRole && defaultRole._id.toString() === role._id.toString()) {
          throw new InvalidRequestError('Default role cannot be unset.');
        }
      }

      if (isDefault === true && role.isDefault !== true) {
        const currentDefault = await EntityHelper.findDefaultRole(req.jwt.team._id);
        if (currentDefault && currentDefault._id.toString() !== role._id.toString()) {
          currentDefault.isDefault = false;
          await EntityHelper.update(currentDefault);
        }
      }

      role.name = name;
      role.permissions = permissions;
      role.isDefault = isDefault === true;

      const updated = await EntityHelper.update(role);

      return res.json(updated);
    }

    if (isDefault === true) {
      const currentDefault = await EntityHelper.findDefaultRole(req.jwt.team._id);
      if (currentDefault) {
        currentDefault.isDefault = false;
        await EntityHelper.update(currentDefault);
      }
    }

    const role = new NewRole(req.jwt.team, name, permissions, isDefault === true);
    const created = await EntityHelper.create(role, Role);

    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const role = await EntityHelper.findOneById(Role, req.params.id);

    if (!role || !EntityHelper.isEntityOwnedBy(role, req.jwt.user)) {
      throw new InvalidRequestError();
    }

    if (role.isDefault) {
      throw new InvalidRequestError('Default role cannot be deleted.');
    }

    await EntityHelper.remove(Role, role);

    return res.json(role);
  } catch (error) {
    return next(error);
  }
};

export const RoleController = {
  list,
  createOrUpdate,
  remove,
};
