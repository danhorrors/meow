import { Attribute } from './Attribute';
import { id } from './Card';

export interface Lead {
  readonly _id: id;
  userId?: string;
  name: string;
  attributes: Attribute | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LeadPreview {
  userId?: string;
  name: string;
  attributes: Attribute | undefined;
}
