import { Button, Item, Picker, TextArea, TextField } from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { DateTime } from 'luxon';
import { getRequestClient } from '../helpers/RequestHelper';
import { Appointment } from '../interfaces/Appointment';
import { selectActiveUsers, selectRoles, selectSessionUser, selectToken } from '../store/Store';
import { store } from '../store/Store';
import { showModalError, showModalSuccess } from '../actions/Actions';
import { PermissionDenied } from '../components/PermissionDenied';
import { hasPermission } from '../helpers/PermissionHelper';
import { FILTER_BY_NONE } from '../Constants';

type CalendarMode = 'list' | 'day' | 'week' | 'month';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toLocalDateTime = (value: string | undefined) => {
  if (!value) return null;
  const date = DateTime.fromISO(value);
  return date.isValid ? date.toLocal() : null;
};

const formatDateTime = (value: string | undefined) => {
  const date = toLocalDateTime(value);
  return date ? date.toFormat('yyyy-LL-dd HH:mm') : '';
};

const formatTime = (value: string | undefined) => {
  const date = toLocalDateTime(value);
  return date ? date.toFormat('HH:mm') : '';
};

export const AppointmentsPage = () => {
  const token = useSelector(selectToken);
  const users = useSelector(selectActiveUsers);
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);
  const client = getRequestClient(token);

  const canBrowse = hasPermission(sessionUser, roles, 'appointments', 'browse');
  const canAdd = hasPermission(sessionUser, roles, 'appointments', 'add');
  const canEdit = hasPermission(sessionUser, roles, 'appointments', 'edit');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState<string>(FILTER_BY_NONE.key);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [mode, setMode] = useState<CalendarMode>('week');
  const [focusDate, setFocusDate] = useState(DateTime.now().startOf('day'));

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(DateTime.now().toISODate() || '');
  const [time, setTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [description, setDescription] = useState('');
  const [assignUserId, setAssignUserId] = useState<string | undefined>(sessionUser?._id);
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((user) => map.set(user._id, user.name));
    return map;
  }, [users]);

  const loadAppointments = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const payload = await client.getAppointments({
        userId: userIdFilter,
        status: statusFilter,
        from: fromFilter || undefined,
        to: toFilter || undefined,
      });
      setAppointments(payload);
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [token, userIdFilter, statusFilter, fromFilter, toFilter]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) => DateTime.fromISO(a.startAt).toMillis() - DateTime.fromISO(b.startAt).toMillis()
    );
  }, [appointments]);

  const dayAppointments = useMemo(() => {
    return sortedAppointments.filter((appointment) => {
      const start = toLocalDateTime(appointment.startAt);
      return start ? start.hasSame(focusDate, 'day') : false;
    });
  }, [sortedAppointments, focusDate]);

  const weekDays = useMemo(() => {
    const weekStart = focusDate.startOf('week');
    return Array.from({ length: 7 }, (_, index) => weekStart.plus({ days: index }));
  }, [focusDate]);

  const weekAppointments = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    weekDays.forEach((day) => grouped.set(day.toISODate() || '', []));
    sortedAppointments.forEach((appointment) => {
      const start = toLocalDateTime(appointment.startAt);
      if (!start) return;
      const key = start.toISODate() || '';
      if (grouped.has(key)) {
        grouped.get(key)!.push(appointment);
      }
    });
    grouped.forEach((list) =>
      list.sort(
        (a, b) =>
          DateTime.fromISO(a.startAt).toMillis() - DateTime.fromISO(b.startAt).toMillis()
      )
    );
    return grouped;
  }, [sortedAppointments, weekDays]);

  const monthDays = useMemo(() => {
    const monthStart = focusDate.startOf('month');
    const gridStart = monthStart.startOf('week');
    return Array.from({ length: 42 }, (_, index) => gridStart.plus({ days: index }));
  }, [focusDate]);

  const monthAppointments = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    monthDays.forEach((day) => grouped.set(day.toISODate() || '', []));
    sortedAppointments.forEach((appointment) => {
      const start = toLocalDateTime(appointment.startAt);
      if (!start) return;
      const key = start.toISODate() || '';
      if (grouped.has(key)) {
        grouped.get(key)!.push(appointment);
      }
    });
    grouped.forEach((list) =>
      list.sort(
        (a, b) =>
          DateTime.fromISO(a.startAt).toMillis() - DateTime.fromISO(b.startAt).toMillis()
      )
    );
    return grouped;
  }, [sortedAppointments, monthDays]);

  const updateStatus = async (
    appointment: Appointment,
    status: 'scheduled' | 'completed' | 'cancelled'
  ) => {
    try {
      await client.updateAppointment(appointment._id, { status });
      await loadAppointments();
      store.dispatch(showModalSuccess('Appointment updated.'));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const createAppointment = async () => {
    const start = DateTime.fromISO(`${date}T${time}:00`, { zone: timeZone || 'UTC' });
    if (!start.isValid) {
      store.dispatch(showModalError('Invalid date/time.'));
      return;
    }
    const duration = parseInt(durationMinutes, 10);
    if (Number.isNaN(duration) || duration <= 0) {
      store.dispatch(showModalError('Duration must be a positive number.'));
      return;
    }
    if (!title.trim()) {
      store.dispatch(showModalError('Title is required.'));
      return;
    }

    try {
      await client.createAppointment({
        title: title.trim(),
        description: description.trim() || undefined,
        userId: assignUserId,
        startAt: start.toISO()!,
        endAt: start.plus({ minutes: duration }).toISO()!,
        timeZone,
        status: 'scheduled',
      });
      setTitle('');
      setDescription('');
      await loadAppointments();
      store.dispatch(showModalSuccess('Appointment created.'));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const moveFocusDate = (direction: -1 | 1) => {
    if (mode === 'day') {
      setFocusDate((previous) => previous.plus({ days: direction }));
      return;
    }
    if (mode === 'week') {
      setFocusDate((previous) => previous.plus({ weeks: direction }));
      return;
    }
    if (mode === 'month') {
      setFocusDate((previous) => previous.plus({ months: direction }));
      return;
    }
  };

  const calendarTitle = useMemo(() => {
    if (mode === 'day') {
      return focusDate.toFormat('cccc, dd LLL yyyy');
    }
    if (mode === 'week') {
      const start = focusDate.startOf('week');
      const end = start.plus({ days: 6 });
      return `${start.toFormat('dd LLL')} - ${end.toFormat('dd LLL yyyy')}`;
    }
    return focusDate.toFormat('LLLL yyyy');
  }, [mode, focusDate]);

  if (!canBrowse) {
    return <PermissionDenied />;
  }

  return (
    <div className="canvas">
      <div className="list-view-header">
        <div>
          <h2>Appointments {sortedAppointments.length}</h2>
        </div>
      </div>

      <div className="content-box" style={{ marginBottom: '12px' }}>
        <h3>Filters</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Picker
            width="200px"
            label="Owner"
            selectedKey={userIdFilter}
            onSelectionChange={(key) => setUserIdFilter(key.toString())}
          >
            {[{ _id: FILTER_BY_NONE.key, name: FILTER_BY_NONE.name }, ...users].map((user) => (
              <Item key={user._id}>{user.name}</Item>
            ))}
          </Picker>
          <Picker
            width="180px"
            label="Status"
            selectedKey={statusFilter}
            onSelectionChange={(key) => setStatusFilter(key.toString())}
          >
            <Item key="all">All</Item>
            <Item key="scheduled">Scheduled</Item>
            <Item key="completed">Completed</Item>
            <Item key="cancelled">Cancelled</Item>
          </Picker>
          <TextField
            label="From (YYYY-MM-DD)"
            width="180px"
            value={fromFilter}
            onChange={setFromFilter}
          />
          <TextField label="To (YYYY-MM-DD)" width="180px" value={toFilter} onChange={setToFilter} />
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button variant="secondary" onPress={loadAppointments}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {canAdd && (
        <div className="content-box" style={{ marginBottom: '12px' }}>
          <h3>Create appointment (standalone)</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <TextField label="Title" width="320px" value={title} onChange={setTitle} />
            <TextField label="Date (YYYY-MM-DD)" width="170px" value={date} onChange={setDate} />
            <TextField label="Time (HH:MM)" width="130px" value={time} onChange={setTime} />
            <TextField
              label="Duration (minutes)"
              width="170px"
              value={durationMinutes}
              onChange={setDurationMinutes}
            />
            <TextField label="Time Zone" width="220px" value={timeZone} onChange={setTimeZone} />
            <Picker
              width="220px"
              label="Assign user"
              selectedKey={assignUserId}
              onSelectionChange={(key) => setAssignUserId(key.toString())}
            >
              {users.map((user) => (
                <Item key={user._id}>{user.name}</Item>
              ))}
            </Picker>
            <div style={{ minWidth: '340px', flexGrow: 1 }}>
              <TextArea label="Description" value={description} onChange={setDescription} width="100%" />
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <Button variant="primary" onPress={createAppointment}>
              Create Appointment
            </Button>
          </div>
        </div>
      )}

      <div className="content-box">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <Button variant={mode === 'list' ? 'primary' : 'secondary'} onPress={() => setMode('list')}>
            List
          </Button>
          <Button variant={mode === 'day' ? 'primary' : 'secondary'} onPress={() => setMode('day')}>
            Day
          </Button>
          <Button variant={mode === 'week' ? 'primary' : 'secondary'} onPress={() => setMode('week')}>
            Week
          </Button>
          <Button
            variant={mode === 'month' ? 'primary' : 'secondary'}
            onPress={() => setMode('month')}
          >
            Month
          </Button>
        </div>

        {mode !== 'list' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onPress={() => moveFocusDate(-1)}>
                Prev
              </Button>
              <Button variant="secondary" onPress={() => setFocusDate(DateTime.now().startOf('day'))}>
                Today
              </Button>
              <Button variant="secondary" onPress={() => moveFocusDate(1)}>
                Next
              </Button>
            </div>
            <h3 style={{ margin: 0 }}>{calendarTitle}</h3>
          </div>
        )}

        {mode === 'list' && (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Title</th>
                  <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Owner</th>
                  <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Start</th>
                  <th style={{ textAlign: 'left', paddingBottom: '8px' }}>End</th>
                  <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Source</th>
                  <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Status</th>
                  <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Calendar</th>
                  <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedAppointments.map((appointment) => (
                  <tr key={appointment._id}>
                    <td style={{ paddingBottom: '8px' }}>{appointment.title}</td>
                    <td style={{ paddingBottom: '8px' }}>
                      {usersById.get(appointment.userId) || appointment.userId}
                    </td>
                    <td style={{ paddingBottom: '8px' }}>{formatDateTime(appointment.startAt)}</td>
                    <td style={{ paddingBottom: '8px' }}>{formatDateTime(appointment.endAt)}</td>
                    <td style={{ paddingBottom: '8px' }}>{appointment.source}</td>
                    <td style={{ paddingBottom: '8px' }}>{appointment.status}</td>
                    <td style={{ paddingBottom: '8px' }}>
                      {appointment.calendarLinked ? 'Linked' : 'Standalone'}
                    </td>
                    <td style={{ paddingBottom: '8px' }}>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="secondary"
                            onPress={() => updateStatus(appointment, 'completed')}
                          >
                            Complete
                          </Button>
                          <Button variant="negative" onPress={() => updateStatus(appointment, 'cancelled')}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && sortedAppointments.length === 0 && (
                  <tr>
                    <td colSpan={8}>No appointments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {mode === 'day' && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {Array.from({ length: 24 }, (_, hour) => {
              const hourItems = dayAppointments.filter((appointment) => {
                const start = toLocalDateTime(appointment.startAt);
                return start ? start.hour === hour : false;
              });
              return (
                <div
                  key={hour}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr',
                    gap: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    paddingBottom: '8px',
                  }}
                >
                  <div style={{ color: '#9aa4bf' }}>{`${hour.toString().padStart(2, '0')}:00`}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {hourItems.map((appointment) => (
                      <div
                        key={appointment._id}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          minWidth: '220px',
                        }}
                      >
                        <div>
                          <b>{appointment.title}</b>
                        </div>
                        <div style={{ fontSize: '12px', color: '#9aa4bf' }}>
                          {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)} |{' '}
                          {usersById.get(appointment.userId) || appointment.userId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!isLoading && dayAppointments.length === 0 && <div>No appointments on this day.</div>}
          </div>
        )}

        {mode === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(180px, 1fr))', gap: '8px' }}>
            {weekDays.map((day, index) => {
              const key = day.toISODate() || '';
              const items = weekAppointments.get(key) || [];
              const isToday = day.hasSame(DateTime.now(), 'day');
              return (
                <div
                  key={key}
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '10px',
                    background: isToday ? 'rgba(255,122,26,0.12)' : 'rgba(255,255,255,0.03)',
                    minHeight: '220px',
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <b>{WEEK_DAYS[index]}</b> {day.toFormat('dd LLL')}
                  </div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {items.map((appointment) => (
                      <div
                        key={appointment._id}
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: '8px',
                          padding: '8px',
                        }}
                      >
                        <div>
                          <b>{formatTime(appointment.startAt)}</b> {appointment.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9aa4bf' }}>
                          {usersById.get(appointment.userId) || appointment.userId}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <div style={{ color: '#9aa4bf' }}>No items</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {mode === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(140px, 1fr))', gap: '8px' }}>
            {monthDays.map((day) => {
              const key = day.toISODate() || '';
              const items = monthAppointments.get(key) || [];
              const inMonth = day.month === focusDate.month;
              const isToday = day.hasSame(DateTime.now(), 'day');
              return (
                <div
                  key={key}
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '8px',
                    minHeight: '120px',
                    opacity: inMonth ? 1 : 0.45,
                    background: isToday ? 'rgba(255,122,26,0.12)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setFocusDate(day.startOf('day'));
                    setMode('day');
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>{day.toFormat('dd')}</div>
                  <div style={{ display: 'grid', gap: '4px' }}>
                    {items.slice(0, 3).map((appointment) => (
                      <div
                        key={appointment._id}
                        style={{
                          background: 'rgba(0,0,0,0.22)',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {formatTime(appointment.startAt)} {appointment.title}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div style={{ color: '#9aa4bf', fontSize: '12px' }}>+{items.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
