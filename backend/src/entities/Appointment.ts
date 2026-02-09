import { Entity } from '../helpers/EntityDecorator.js';
import { ExistingEntity, NewEntity } from './BaseEntity.js';
import { ObjectId } from 'mongodb';
import { Team } from './Team.js';

export enum AppointmentStatus {
  Scheduled = 'scheduled',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum AppointmentSource {
  Lead = 'lead',
  Manual = 'manual',
}

@Entity({ name: 'Appointments' })
export class Appointment implements ExistingEntity {
  _id: ObjectId;
  teamId: ObjectId;
  userId: ObjectId;
  leadId?: ObjectId;
  accountId?: ObjectId;
  cardId?: ObjectId;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  googleEventId?: string;
  calendarLinked?: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    _id: ObjectId,
    teamId: ObjectId,
    userId: ObjectId,
    title: string,
    startAt: Date,
    endAt: Date,
    timeZone: string,
    status: AppointmentStatus,
    source: AppointmentSource,
    createdAt: Date,
    updatedAt: Date
  ) {
    this._id = _id;
    this.teamId = teamId;
    this.userId = userId;
    this.title = title;
    this.startAt = startAt;
    this.endAt = endAt;
    this.timeZone = timeZone;
    this.status = status;
    this.source = source;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toPlain(): PlainAppointment {
    return {
      _id: this._id.toString(),
      teamId: this.teamId.toString(),
      userId: this.userId.toString(),
      leadId: this.leadId?.toString(),
      accountId: this.accountId?.toString(),
      cardId: this.cardId?.toString(),
      title: this.title,
      description: this.description,
      startAt: this.startAt,
      endAt: this.endAt,
      timeZone: this.timeZone,
      status: this.status,
      source: this.source,
      googleEventId: this.googleEventId,
      calendarLinked: this.calendarLinked === true,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

@Entity({ name: 'Appointments' })
export class NewAppointment implements NewEntity {
  teamId: ObjectId;
  userId: ObjectId;
  leadId?: ObjectId;
  accountId?: ObjectId;
  cardId?: ObjectId;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  googleEventId?: string;
  calendarLinked?: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    team: Team,
    userId: ObjectId,
    title: string,
    startAt: Date,
    endAt: Date,
    timeZone: string,
    source: AppointmentSource = AppointmentSource.Manual
  ) {
    this.teamId = team._id;
    this.userId = userId;
    this.title = title;
    this.startAt = startAt;
    this.endAt = endAt;
    this.timeZone = timeZone;
    this.status = AppointmentStatus.Scheduled;
    this.source = source;
    this.calendarLinked = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

export interface PlainAppointment {
  _id: string;
  teamId: string;
  userId: string;
  leadId?: string;
  accountId?: string;
  cardId?: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  googleEventId?: string;
  calendarLinked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
