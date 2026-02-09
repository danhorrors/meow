import { Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  NewAppointment,
} from '../entities/Appointment.js';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { InvalidRequestParameterError } from '../errors/InvalidRequestParameterError.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import {
  validateAndFetchAppointment,
  validateAndFetchUser,
} from '../helpers/EntityFetchHelper.js';
import { PermissionHelper } from '../helpers/PermissionHelper.js';

const parseDateOrThrow = (value: unknown, key: string): Date => {
  const date = new Date(value as string);
  if (isNaN(date.getTime())) {
    throw new InvalidRequestParameterError(`${key} is invalid`);
  }
  return date;
};

const parseStatus = (value: unknown): AppointmentStatus => {
  if (value === AppointmentStatus.Completed) {
    return AppointmentStatus.Completed;
  }
  if (value === AppointmentStatus.Cancelled) {
    return AppointmentStatus.Cancelled;
  }
  return AppointmentStatus.Scheduled;
};

const parseSource = (value: unknown): AppointmentSource => {
  return value === AppointmentSource.Lead ? AppointmentSource.Lead : AppointmentSource.Manual;
};

const toOptionalObjectId = (value: unknown): ObjectId | undefined => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  if (!EntityHelper.isValidEntityId(value)) {
    throw new InvalidRequestParameterError('entity id is invalid');
  }
  return new ObjectId(value);
};

const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let userId = req.jwt.user._id!;
    if (req.body.userId) {
      await PermissionHelper.ensurePermission(req.jwt.user, 'appointments', 'assign');
      userId = (await validateAndFetchUser(req.body.userId, req.jwt.user))._id!;
    }

    const startAt = parseDateOrThrow(req.body.startAt, 'startAt');
    const endAt = parseDateOrThrow(req.body.endAt, 'endAt');
    if (endAt.getTime() <= startAt.getTime()) {
      throw new InvalidRequestParameterError('endAt must be after startAt');
    }

    const appointment = new NewAppointment(
      req.jwt.team,
      userId,
      req.body.title,
      startAt,
      endAt,
      (req.body.timeZone as string | undefined) || 'UTC',
      parseSource(req.body.source)
    );

    appointment.status = parseStatus(req.body.status);
    appointment.description = req.body.description;
    appointment.leadId = toOptionalObjectId(req.body.leadId);
    appointment.accountId = toOptionalObjectId(req.body.accountId);
    appointment.cardId = toOptionalObjectId(req.body.cardId);
    appointment.googleEventId = req.body.googleEventId;
    appointment.calendarLinked = req.body.calendarLinked === true;

    const created = await EntityHelper.create(appointment, Appointment);

    return res.status(201).json(created.toPlain());
  } catch (error) {
    return next(error);
  }
};

const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const appointment = await validateAndFetchAppointment(req.params.id, req.jwt.user);

    if (req.body.userId && req.body.userId.toString() !== appointment.userId.toString()) {
      await PermissionHelper.ensurePermission(req.jwt.user, 'appointments', 'assign');
      const user = await validateAndFetchUser(req.body.userId, req.jwt.user);
      appointment.userId = user._id!;
    }

    if (req.body.title) {
      appointment.title = req.body.title;
    }
    if (typeof req.body.description === 'string' || req.body.description === null) {
      appointment.description = req.body.description || undefined;
    }
    if (req.body.timeZone) {
      appointment.timeZone = req.body.timeZone;
    }
    if (req.body.status) {
      appointment.status = parseStatus(req.body.status);
    }
    if (req.body.startAt) {
      appointment.startAt = parseDateOrThrow(req.body.startAt, 'startAt');
    }
    if (req.body.endAt) {
      appointment.endAt = parseDateOrThrow(req.body.endAt, 'endAt');
    }
    if (appointment.endAt.getTime() <= appointment.startAt.getTime()) {
      throw new InvalidRequestParameterError('endAt must be after startAt');
    }

    if (req.body.leadId !== undefined) {
      appointment.leadId = toOptionalObjectId(req.body.leadId);
    }
    if (req.body.accountId !== undefined) {
      appointment.accountId = toOptionalObjectId(req.body.accountId);
    }
    if (req.body.cardId !== undefined) {
      appointment.cardId = toOptionalObjectId(req.body.cardId);
    }
    if (req.body.googleEventId !== undefined) {
      appointment.googleEventId = req.body.googleEventId || undefined;
    }
    if (req.body.calendarLinked !== undefined) {
      appointment.calendarLinked = req.body.calendarLinked === true;
    }

    const updated = await EntityHelper.update(appointment);

    return res.json(updated.toPlain());
  } catch (error) {
    return next(error);
  }
};

const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query: any = {
      teamId: req.jwt.team._id,
    };

    if (req.query.userId && req.query.userId !== 'all') {
      const userId = req.query.userId.toString();
      if (!EntityHelper.isValidEntityId(userId)) {
        throw new InvalidRequestParameterError('userId is invalid');
      }
      query.userId = new ObjectId(userId);
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status.toString();
    }

    if (req.query.from || req.query.to) {
      query.startAt = {};
      if (req.query.from) {
        query.startAt.$gte = parseDateOrThrow(req.query.from, 'from');
      }
      if (req.query.to) {
        query.startAt.$lte = parseDateOrThrow(req.query.to, 'to');
      }
    }

    const appointments = await EntityHelper.findBy(Appointment, query, { startAt: 1 });

    return res.json(appointments.map((item) => item.toPlain()));
  } catch (error) {
    return next(error);
  }
};

const fetch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const appointment = await validateAndFetchAppointment(req.params.id, req.jwt.user);
    return res.json(appointment.toPlain());
  } catch (error) {
    return next(error);
  }
};

const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const appointment = await validateAndFetchAppointment(req.params.id, req.jwt.user);
    await EntityHelper.remove(Appointment, appointment);
    return res.json(appointment.toPlain());
  } catch (error) {
    return next(error);
  }
};

export const AppointmentController = {
  create,
  update,
  list,
  fetch,
  remove,
};
