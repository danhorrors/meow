import { Attribute } from './Attribute.js';
import { Entity } from '../helpers/EntityDecorator.js';
import { ExistingEntity, NewEntity } from './BaseEntity.js';
import { ObjectId } from 'mongodb';
import { Team } from './Team.js';

@Entity({ name: 'Accounts' })
export class Account implements ExistingEntity {
  _id: ObjectId;
  teamId: ObjectId;
  userId: ObjectId;
  name: string;
  attributes?: Attribute;
  references?: Reference[];
  createdAt: Date;
  updatedAt: Date;

  constructor(
    _id: ObjectId,
    teamId: ObjectId,
    userId: ObjectId,
    name: string,
    createdAt: Date,
    updatedAt: Date
  ) {
    this._id = _id;
    this.teamId = teamId;
    this.userId = userId;
    this.name = name;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toPlain(): PlainAccount {
    return {
      _id: this._id.toString(),
      teamId: this.teamId.toString(),
      userId: this.userId?.toString(),
      name: this.name,
      attributes: this.attributes,
      createdAt: this.createdAt!,
      updatedAt: this.updatedAt!,
    };
  }
}

@Entity({ name: 'Accounts' })
export class NewAccount implements NewEntity {
  /* static _collection = 'Events'; */

  teamId: ObjectId;
  userId: ObjectId;
  name: string;
  attributes?: Attribute;
  references?: Reference[];
  createdAt: Date;
  updatedAt: Date;

  constructor(
    team: Team,
    name: string,
    userId: ObjectId,
    attributes: Attribute = {},
    references?: Reference[]
  ) {
    this.teamId = team._id;
    this.userId = userId;
    this.name = name;
    this.attributes = attributes;
    this.references = references;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

export interface PlainAccount {
  _id: string;
  teamId: string;
  userId?: string;
  name: string;
  attributes?: Attribute;
  createdAt: Date;
  updatedAt: Date;
}

// TODO move to base entity
export interface Reference {
  _id: ObjectId;
  entity: string | null;
  schemaAttributeKey: string;
}
