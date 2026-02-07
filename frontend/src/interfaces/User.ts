import { id } from './Card';

export interface User {
  readonly _id: id;
  readonly name: string;
  readonly createdAt?: string;
  readonly teamId: string;
  readonly authentication: 'local' | 'google';
  roleId?: string;
  isAdmin?: boolean;
  views?: { [key: string]: { [label: string]: any } };
  integrations?: { key: string }[];
  status: UserStatus;
  invite?: string;
  animal?: string;
  color?: string;
}

export enum UserStatus {
  Invited = 'invited',
  Enabled = 'enabled',
  Disabled = 'disabled',
  Deleted = 'deleted',
  SingleSignOn = 'single-sign-on',
}
