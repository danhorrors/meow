import { Button, Item, TabList, TabPanels, Tabs, TextField, TextArea } from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  addAccount,
  addCard,
  addLead,
  deleteLead,
  hideLayer,
  showModalError,
  showModalSuccess,
  updateLead,
} from '../../actions/Actions';
import { Lead, LeadPreview } from '../../interfaces/Lead';
import { ApplicationStore } from '../../store/ApplicationStore';
import {
  selectActiveUsers,
  selectInterfaceStateId,
  selectLead,
  selectToken,
  store,
} from '../../store/Store';
import { Translations } from '../../Translations';
import { Form } from './Form';
import useMobileLayout from '../../hooks/useMobileLayout';
import { DEFAULT_LANGUAGE } from '../../Constants';
import { Avatar } from '../Avatar';
import { User } from '../../interfaces/User';
import { getRequestClient } from '../../helpers/RequestHelper';
import { DatePicker } from '@adobe/react-spectrum';
import { parseDate } from '@internationalized/date';
import { DateTime } from 'luxon';

export const Layer = () => {
  const token = useSelector(selectToken);
  const client = getRequestClient(token);
  const id = useSelector(selectInterfaceStateId);
  const lead = useSelector((store: ApplicationStore) => selectLead(store, id));
  const users = useSelector(selectActiveUsers);
  const isMobileLayout = useMobileLayout();
  const [isUserLayerVisible, setIsUserLayerVisible] = useState(false);

  const [meetingDate, setMeetingDate] = useState<string | undefined>(undefined);
  const [meetingTime, setMeetingTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [attendees, setAttendees] = useState('');

  const hideLeadDetail = () => {
    store.dispatch(hideLayer());
  };

  const update = async (id: Lead['_id'] | undefined, preview: LeadPreview) => {
    try {
      if (id) {
        const updated = await client.updateLead({ ...lead!, ...preview });
        store.dispatch(updateLead({ ...updated }));
        store.dispatch(showModalSuccess(Translations.LeadUpdatedConfirmation[DEFAULT_LANGUAGE]));
      } else {
        const created = await client.createLead(preview);
        store.dispatch(addLead({ ...created }));
        store.dispatch(showModalSuccess(Translations.LeadCreatedConfirmation[DEFAULT_LANGUAGE]));
      }
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const assign = async (userId: User['_id']) => {
    if (!lead) {
      return;
    }

    try {
      const updated = await client.updateLead({ ...lead, userId });
      store.dispatch(updateLead({ ...updated }));
      setIsUserLayerVisible(false);
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const canBookMeeting = useMemo(() => {
    return Boolean(id && meetingDate && meetingTime && durationMinutes);
  }, [id, meetingDate, meetingTime, durationMinutes]);

  const bookMeeting = async () => {
    if (!id || !meetingDate) {
      return;
    }

    const startAt = DateTime.fromISO(`${meetingDate}T${meetingTime}:00`, {
      zone: timeZone || 'UTC',
    });

    try {
      const response = await client.bookLeadMeeting(id, {
        startAt: startAt.toISO(),
        durationMinutes: parseInt(durationMinutes),
        timeZone,
        summary,
        description,
        attendees: attendees
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      });

      if (response?.account) {
        store.dispatch(addAccount(response.account));
      }

      if (response?.card) {
        store.dispatch(addCard(response.card));
      }

      if (lead) {
        store.dispatch(deleteLead(lead));
      }

      store.dispatch(showModalSuccess(Translations.LeadBookedConfirmation[DEFAULT_LANGUAGE]));
      store.dispatch(hideLayer());
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  useEffect(() => {
    if (lead?.name && !summary) {
      setSummary(`Meeting: ${lead.name}`);
    }
  }, [lead]);

  return (
    <div className={`layer ${isMobileLayout ? 'mobile' : 'desktop'}`}>
      <div className="header">
        <div>
          {lead?.userId && (
            <Avatar
              id={lead?.userId}
              width={36}
              onClick={() => setIsUserLayerVisible(!isUserLayerVisible)}
            />
          )}
        </div>

        <div>
          <Button variant="primary" onPress={() => hideLeadDetail()}>
            {Translations.CloseButton[DEFAULT_LANGUAGE]}
          </Button>
        </div>
      </div>

      {isUserLayerVisible && (
        <div className="user-list">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {users.map((user: User) => {
                return (
                  <tr key={user._id} style={{ width: '100%' }}>
                    <td>
                      <Avatar width={36} id={user._id} />
                    </td>
                    <td>
                      <b>{user.name}</b>
                    </td>
                    <td>
                      <Button variant="primary" onPress={() => assign(user._id)}>
                        {Translations.AssignButton[DEFAULT_LANGUAGE]}
                      </Button>
                    </td>
                    <td></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="body">
        <Tabs height="100%">
          <TabList>
            <Item key="lead">
              <span className="tab-title">{Translations.LeadTab[DEFAULT_LANGUAGE]}</span>
            </Item>
            {id && (
              <Item key="booking">
                <span className="tab-title">{Translations.BookMeetingTab[DEFAULT_LANGUAGE]}</span>
              </Item>
            )}
          </TabList>
          <TabPanels>
            <Item key="lead">
              <Form update={update} id={id} />
            </Item>
            {id && (
              <Item key="booking">
                <div style={{ padding: '15px' }}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <DatePicker
                      label={Translations.BookingDateLabel[DEFAULT_LANGUAGE]}
                      value={meetingDate ? parseDate(meetingDate) : undefined}
                      onChange={(value) => setMeetingDate(value?.toString())}
                    />
                    <TextField
                      label={Translations.BookingTimeLabel[DEFAULT_LANGUAGE]}
                      value={meetingTime}
                      onChange={setMeetingTime}
                      placeholder="09:00"
                    />
                    <TextField
                      label={Translations.BookingDurationLabel[DEFAULT_LANGUAGE]}
                      value={durationMinutes}
                      onChange={setDurationMinutes}
                      placeholder="30"
                    />
                    <TextField
                      label={Translations.BookingTimeZoneLabel[DEFAULT_LANGUAGE]}
                      value={timeZone}
                      onChange={setTimeZone}
                    />
                    <TextField
                      label={Translations.BookingSummaryLabel[DEFAULT_LANGUAGE]}
                      value={summary}
                      onChange={setSummary}
                    />
                    <TextArea
                      label={Translations.BookingDescriptionLabel[DEFAULT_LANGUAGE]}
                      value={description}
                      onChange={setDescription}
                    />
                    <TextField
                      label={Translations.BookingAttendeesLabel[DEFAULT_LANGUAGE]}
                      value={attendees}
                      onChange={setAttendees}
                      placeholder="name@example.com, other@example.com"
                    />
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <Button variant="primary" onPress={bookMeeting} isDisabled={!canBookMeeting}>
                      {Translations.BookMeetingButton[DEFAULT_LANGUAGE]}
                    </Button>
                  </div>
                </div>
              </Item>
            )}
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};
