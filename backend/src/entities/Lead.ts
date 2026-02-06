import { Attribute } from './Attribute.js';
import { Entity } from '../helpers/EntityDecorator.js';
import { ExistingEntity, NewEntity } from './BaseEntity.js';
import { ObjectId } from 'mongodb';
import { Team } from './Team.js';

@Entity({ name: 'Leads' })
export class Lead implements ExistingEntity {
  _id: ObjectId;
  teamId: ObjectId;
  userId: ObjectId;
  name: string;
  attributes?: Attribute;
  contact?: {
    email?: string;
    phone?: string;
    domain?: string;
  };
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

  toPlain(): PlainLead {
    return {
      _id: this._id.toString(),
      teamId: this.teamId.toString(),
      userId: this.userId?.toString(),
      name: this.name,
      attributes: this.attributes,
      contact: this.contact,
      createdAt: this.createdAt!,
      updatedAt: this.updatedAt!,
    };
  }
}

@Entity({ name: 'Leads' })
export class NewLead implements NewEntity {
  teamId: ObjectId;
  userId: ObjectId;
  name: string;
  attributes?: Attribute;
  contact?: {
    email?: string;
    phone?: string;
    domain?: string;
  };
  createdAt: Date;
  updatedAt: Date;

  constructor(team: Team, userId: ObjectId, name: string, attributes: Attribute = {}) {
    this.teamId = team._id;
    this.userId = userId;
    this.name = name;
    this.attributes = attributes;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

export interface PlainLead {
  _id: string;
  teamId: string;
  userId?: string;
  name: string;
  attributes?: Attribute;
  contact?: {
    email?: string;
    phone?: string;
    domain?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
