import { PermissionAction, PermissionModule, Role } from '../interfaces/Role';
import { User } from '../interfaces/User';

const DEFAULT_ALLOWED = new Set(['browse', 'read']);

export const hasPermission = (
  user: User | undefined,
  roles: Role[] | undefined,
  module: PermissionModule,
  action: PermissionAction
) => {
  if (!user) {
    return false;
  }

  if (user.isAdmin || user.name?.toLowerCase() === 'admin') {
    return true;
  }

  if (!roles || roles.length === 0) {
    return true;
  }

  const role = roles.find((item) => item._id === user.roleId);

  if (!role) {
    return DEFAULT_ALLOWED.has(action);
  }

  const modulePermissions = role.permissions?.[module];
  if (!modulePermissions) {
    return DEFAULT_ALLOWED.has(action);
  }

  return modulePermissions?.[action] === true;
};
