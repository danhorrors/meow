import { id } from './Card';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type AppointmentSource = 'lead' | 'manual';

export interface Appointment {
  readonly _id: id;
  readonly teamId: id;
  userId: id;
  leadId?: id;
  accountId?: id;
  cardId?: id;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  googleEventId?: string;
  calendarLinked: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AppointmentCreatePayload {
  title: string;
  description?: string;
  userId?: string;
  startAt: string;
  endAt: string;
  timeZone?: string;
  status?: AppointmentStatus;
}

export interface AppointmentUpdatePayload {
  title?: string;
  description?: string | null;
  userId?: string;
  startAt?: string;
  endAt?: string;
  timeZone?: string;
  status?: AppointmentStatus;
}
