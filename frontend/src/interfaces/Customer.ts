import { Attribute } from './Attribute';
import { id } from './Card';

export interface Customer {
  readonly _id: id;
  readonly teamId: id;
  userId?: id;
  name: string;
  attributes?: Attribute;
  contact?: {
    email?: string;
    phone?: string;
    domain?: string;
  };
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface CustomerPreview {
  userId?: id;
  name: string;
  attributes?: Attribute;
  contact?: {
    email?: string;
    phone?: string;
  };
}
