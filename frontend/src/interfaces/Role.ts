export type PermissionAction = 'browse' | 'read' | 'edit' | 'add' | 'delete' | 'assign';
export type PermissionModule =
  | 'opportunities'
  | 'accounts'
  | 'leads'
  | 'appointments'
  | 'customers'
  | 'campaigns'
  | 'emails'
  | 'users'
  | 'settings'
  | 'forecast'
  | 'activity';

export type PermissionSet = {
  [action in PermissionAction]?: boolean;
};

export type RolePermissions = {
  [module in PermissionModule]?: PermissionSet;
};

export interface Role {
  readonly _id: string;
  name: string;
  permissions: RolePermissions;
  isDefault?: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}
