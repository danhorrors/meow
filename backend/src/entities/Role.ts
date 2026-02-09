import { Entity } from '../helpers/EntityDecorator.js';
import { ExistingEntity, NewEntity } from './BaseEntity.js';
import { ObjectId } from 'mongodb';
import { Team } from './Team.js';

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

@Entity({ name: 'Roles' })
export class Role implements ExistingEntity {
  _id: ObjectId;
  teamId: ObjectId;
  name: string;
  permissions: RolePermissions;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    _id: ObjectId,
    teamId: ObjectId,
    name: string,
    permissions: RolePermissions,
    createdAt: Date,
    updatedAt: Date,
    isDefault?: boolean
  ) {
    this._id = _id;
    this.teamId = teamId;
    this.name = name;
    this.permissions = permissions;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.isDefault = isDefault;
  }
}

@Entity({ name: 'Roles' })
export class NewRole implements NewEntity {
  teamId: ObjectId;
  name: string;
  permissions: RolePermissions;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(team: Team, name: string, permissions: RolePermissions, isDefault?: boolean) {
    this.teamId = team._id;
    this.name = name;
    this.permissions = permissions;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.isDefault = isDefault;
  }
}
