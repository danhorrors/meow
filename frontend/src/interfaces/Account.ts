import { Attribute } from './Attribute';
import { id } from './Card';
import { Reference } from './Reference';

export interface Account {
  readonly _id: id;
  userId?: string;
  name: string;
  attributes: Attribute | undefined;
  references?: Reference[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AccountPreview {
  userId?: string;
  name: string;
  attributes: Attribute | undefined;
}
