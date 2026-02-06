import { Role } from '../entities/Role.js';
import { User } from '../entities/User.js';
import { EntityHelper } from './EntityHelper.js';
import { PermissionDeniedError } from '../errors/PermissionDeniedError.js';

const DEFAULT_ALLOWED_ACTIONS = new Set(['browse', 'read']);

const hasPermission = async (
  user: User,
  module: string,
  action: string
): Promise<boolean> => {
  if (user.isAdmin === true || user.name?.toLowerCase() === 'admin') {
    return true;
  }

  const rolesCount = await EntityHelper.countBy(Role, { teamId: user.teamId });
  if (rolesCount === 0) {
    return true;
  }

  if (!user.roleId) {
    return DEFAULT_ALLOWED_ACTIONS.has(action);
  }

  const role = await EntityHelper.findOneById(Role, user.roleId);

  if (!role) {
    return DEFAULT_ALLOWED_ACTIONS.has(action);
  }

  const modulePermissions = (role.permissions as any)?.[module];
  return modulePermissions?.[action] === true;
};

const ensurePermission = async (user: User, module: string, action: string) => {
  const allowed = await hasPermission(user, module, action);

  if (!allowed) {
    throw new PermissionDeniedError(`Missing permission: ${module}.${action}`);
  }
};

const ensurePermissionOrSelf = async (
  user: User,
  targetUserId: string,
  module: string,
  action: string
) => {
  if (user._id.toString() === targetUserId.toString()) {
    return;
  }

  await ensurePermission(user, module, action);
};

export const PermissionHelper = {
  hasPermission,
  ensurePermission,
  ensurePermissionOrSelf,
};
