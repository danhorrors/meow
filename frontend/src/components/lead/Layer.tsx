import { Button, Item, Picker, TabList, TabPanels, Tabs, TextField, TextArea } from '@adobe/react-spectrum';
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
  showLeadLayer,
  updateLead,
} from '../../actions/Actions';
import { Lead, LeadPreview } from '../../interfaces/Lead';
import { ApplicationStore } from '../../store/ApplicationStore';
import {
  selectActiveUsers,
  selectInterfaceStateId,
  selectLeads,
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
import { EmailComposer } from '../email/EmailComposer';
import { EmailLogList } from '../email/EmailLogList';

const TELE_SETTINGS_KEY = 'telemarketer_settings';

const parseBool = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return value.toString() === 'true';
};

const parseOutcomes = (value: unknown, fallback: string[]) => {
  if (!value) return fallback;
  if (Array.isArray(value)) return value.map((item) => item.toString());
  return value
    .toString()
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const CALLBACK_FIELD_KEY = 'lead-callback-at';

export const Layer = () => {
  const token = useSelector(selectToken);
  const client = getRequestClient(token);
  const id = useSelector(selectInterfaceStateId);
  const lead = useSelector((store: ApplicationStore) => selectLead(store, id));
  const leads = useSelector(selectLeads);
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
  const [callOutcome, setCallOutcome] = useState('');
  const [callbackDate, setCallbackDate] = useState<string | undefined>(undefined);
  const [callbackTime, setCallbackTime] = useState('09:00');
  const [scriptChoice, setScriptChoice] = useState('intro');
  const [teleSettings, setTeleSettings] = useState({
    enableQuickActions: true,
    enableAutoAdvance: true,
    autoAdvanceOutcomesOnly: true,
    autoAdvanceOutcomes: ['Call back', 'No answer'],
    enableScripts: true,
    enableCallTimer: true,
    scriptsJson: '',
  });
  const [callTimerStart, setCallTimerStart] = useState<number | null>(null);
  const [callTimerElapsed, setCallTimerElapsed] = useState(0);

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

  const hasPhone = Boolean(lead?.contact?.phone);
  const hasEmail = Boolean(lead?.contact?.email);

  const leadIndex = useMemo(() => {
    if (!id) return -1;
    return leads.findIndex((item) => item._id === id);
  }, [leads, id]);

  const prevLeadId = leadIndex > 0 ? leads[leadIndex - 1]?._id : undefined;
  const nextLeadId = leadIndex >= 0 ? leads[leadIndex + 1]?._id : undefined;

  const goToLead = (leadId?: string) => {
    if (!leadId) return;
    store.dispatch(showLeadLayer(leadId));
  };

  useEffect(() => {
    if (!token) return;
    client
      .getIntegration(TELE_SETTINGS_KEY)
      .then((payload) => {
        const attrs = payload?.attributes || {};
        setTeleSettings({
          enableQuickActions: parseBool(attrs.enableQuickActions, true),
          enableAutoAdvance: parseBool(attrs.enableAutoAdvance, true),
          autoAdvanceOutcomesOnly: parseBool(attrs.autoAdvanceOutcomesOnly, true),
          autoAdvanceOutcomes: parseOutcomes(attrs.autoAdvanceOutcomes, ['Call back', 'No answer']),
          enableScripts: parseBool(attrs.enableScripts, true),
          enableCallTimer: parseBool(attrs.enableCallTimer, true),
          scriptsJson: (attrs.scriptsJson as string) || '',
        });
      })
      .catch(() => undefined);
  }, [token]);

  const copyText = async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      store.dispatch(showModalSuccess('Copied'));
    } catch (error) {
      store.dispatch(showModalError('Copy failed'));
    }
  };

  const markContacted = async () => {
    if (!lead) return;
    const attributes = { ...(lead.attributes || {}) } as Record<string, any>;
    const count = parseInt(attributes['lead-contacted-count'] || '0', 10) || 0;
    attributes['lead-contacted-count'] = count + 1;
    attributes['lead-last-contacted'] = new Date().toISOString();
    if (callOutcome) {
      attributes['lead-call-outcome'] = callOutcome;
    }
    if (callbackDate) {
      const callbackAt = DateTime.fromISO(`${callbackDate}T${callbackTime}:00`, { zone: timeZone || 'UTC' });
      const callbackAtIso = callbackAt.toISO();
      if (callbackAtIso) {
        attributes[CALLBACK_FIELD_KEY] = callbackAtIso;
      }
    }
    if (teleSettings.enableCallTimer && callTimerElapsed > 0) {
      attributes['lead-last-call-duration'] = callTimerElapsed.toString();
    }

    try {
      const updated = await client.updateLead({ ...lead, attributes });
      store.dispatch(updateLead({ ...updated }));
      store.dispatch(showModalSuccess('Marked contacted'));
      const shouldAdvance =
        teleSettings.enableAutoAdvance &&
        nextLeadId &&
        (!teleSettings.autoAdvanceOutcomesOnly ||
          teleSettings.autoAdvanceOutcomes.includes(callOutcome));
      if (shouldAdvance) {
        store.dispatch(showLeadLayer(nextLeadId));
      }
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const bookMeeting = async () => {
    if (!id || !meetingDate) {
      return;
    }

    const startAt = DateTime.fromISO(`${meetingDate}T${meetingTime}:00`, {
      zone: timeZone || 'UTC',
    });

    if (!startAt.isValid) {
      store.dispatch(showModalError('Invalid meeting time.'));
      return;
    }

    const startAtIso = startAt.toISO();

    if (!startAtIso) {
      store.dispatch(showModalError('Invalid meeting time.'));
      return;
    }

    try {
      const response = await client.bookLeadMeeting(id, {
        startAt: startAtIso,
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

  useEffect(() => {
    if (lead?.contact?.email && !attendees) {
      setAttendees(lead.contact.email);
    }
  }, [lead, attendees]);

  useEffect(() => {
    const outcome = lead?.attributes?.['lead-call-outcome']?.toString() || '';
    setCallOutcome(outcome);
  }, [lead?._id]);

  useEffect(() => {
    const callbackRaw = lead?.attributes?.[CALLBACK_FIELD_KEY]?.toString();
    if (!callbackRaw) {
      setCallbackDate(undefined);
      setCallbackTime('09:00');
      return;
    }
    const callbackAt = DateTime.fromISO(callbackRaw);
    if (!callbackAt.isValid) {
      setCallbackDate(undefined);
      setCallbackTime('09:00');
      return;
    }
    setCallbackDate(callbackAt.toISODate() || undefined);
    setCallbackTime(callbackAt.toFormat('HH:mm'));
  }, [lead?._id]);

  useEffect(() => {
    if (!callTimerStart) return;
    const timer = setInterval(() => {
      setCallTimerElapsed(Math.floor((Date.now() - callTimerStart) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [callTimerStart]);

  const toggleTimer = () => {
    if (!callTimerStart) {
      setCallTimerStart(Date.now());
      setCallTimerElapsed(0);
      return;
    }
    setCallTimerStart(null);
  };

  const scripts = useMemo(() => {
    const fallback = {
      intro: `Hi ${lead?.name || ''}, it’s ${store.getState().session.user?.name || 'me'}. I’m calling because we help teams streamline follow-ups and keep every lead on track. Do you have 30 seconds for a quick overview?`,
      followup: `Hi ${lead?.name || ''}, just following up on my last note. We specialize in making outreach and tracking effortless. Would it be helpful to schedule a short call?`,
      voicemail: `Hi ${lead?.name || ''}, it’s ${store.getState().session.user?.name || 'me'}. I’m calling about helping your team improve follow-up speed and visibility. I’ll send an email as well. Feel free to reply or call me back.`,
    };

    try {
      const payload = JSON.parse(
        teleSettings.scriptsJson || ''
      );
      if (payload && typeof payload === 'object') {
        return { ...fallback, ...payload };
      }
    } catch (error) {
      return fallback;
    }

    return fallback;
  }, [lead, teleSettings.scriptsJson]);

  const tabs: JSX.Element[] = [
    <Item key="lead">
      <span className="tab-title">{Translations.LeadTab[DEFAULT_LANGUAGE]}</span>
    </Item>,
  ];

  const panels: JSX.Element[] = [
    <Item key="lead">
      <div style={{ display: 'grid', gap: '16px' }}>
        {id && teleSettings.enableQuickActions && (
          <div className="content-box">
            <div className="schema-editor-header">
              <div className="title">
                <h2>{Translations.LeadQuickActionsTitle[DEFAULT_LANGUAGE]}</h2>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  onPress={() => window.open(`tel:${lead?.contact?.phone || ''}`)}
                  isDisabled={!hasPhone}
                >
                  {Translations.LeadCallButton[DEFAULT_LANGUAGE]}
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => window.open(`sms:${lead?.contact?.phone || ''}`)}
                  isDisabled={!hasPhone}
                >
                  {Translations.LeadSmsButton[DEFAULT_LANGUAGE]}
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => window.open(`mailto:${lead?.contact?.email || ''}`)}
                  isDisabled={!hasEmail}
                >
                  {Translations.LeadEmailButton[DEFAULT_LANGUAGE]}
                </Button>
                <Button variant="secondary" onPress={() => copyText(lead?.contact?.phone)} isDisabled={!hasPhone}>
                  {Translations.LeadCopyPhoneButton[DEFAULT_LANGUAGE]}
                </Button>
                <Button variant="secondary" onPress={() => copyText(lead?.contact?.email)} isDisabled={!hasEmail}>
                  {Translations.LeadCopyEmailButton[DEFAULT_LANGUAGE]}
                </Button>
              </div>
              {teleSettings.enableScripts && (
                <div style={{ display: 'grid', gap: '8px' }}>
                <div>
                  <b>{Translations.LeadScriptsTitle[DEFAULT_LANGUAGE]}</b>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button variant={scriptChoice === 'intro' ? 'primary' : 'secondary'} onPress={() => setScriptChoice('intro')}>
                    Intro
                  </Button>
                  <Button variant={scriptChoice === 'followup' ? 'primary' : 'secondary'} onPress={() => setScriptChoice('followup')}>
                    Follow-up
                  </Button>
                  <Button variant={scriptChoice === 'voicemail' ? 'primary' : 'secondary'} onPress={() => setScriptChoice('voicemail')}>
                    Voicemail
                  </Button>
                  <Button variant="secondary" onPress={() => copyText(scripts[scriptChoice])}>
                    {Translations.LeadCopyScriptButton[DEFAULT_LANGUAGE]}
                  </Button>
                </div>
                <TextArea
                  label={Translations.LeadScriptsTitle[DEFAULT_LANGUAGE]}
                  value={scripts[scriptChoice]}
                  onChange={() => undefined}
                />
              </div>
              )}
              {teleSettings.enableCallTimer && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button variant={callTimerStart ? 'primary' : 'secondary'} onPress={toggleTimer}>
                    {callTimerStart ? 'Stop timer' : 'Start timer'}
                  </Button>
                  <div>{Math.floor(callTimerElapsed / 60)}:{(callTimerElapsed % 60).toString().padStart(2, '0')}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Picker
                  width={240}
                  selectedKey={callOutcome}
                  onSelectionChange={(key) => setCallOutcome(key.toString())}
                  aria-label={Translations.LeadCallOutcomeLabel[DEFAULT_LANGUAGE]}
                >
                  <Item key="">{Translations.IgnoreLabel[DEFAULT_LANGUAGE]}</Item>
                  <Item key="Connected">Connected</Item>
                  <Item key="Left voicemail">Left voicemail</Item>
                  <Item key="No answer">No answer</Item>
                  <Item key="Wrong number">Wrong number</Item>
                  <Item key="Call back">Call back</Item>
                  <Item key="Not interested">Not interested</Item>
                </Picker>
                <Button variant="primary" onPress={markContacted}>
                  {Translations.LeadMarkContactedButton[DEFAULT_LANGUAGE]}
                </Button>
                <Button variant="secondary" onPress={() => goToLead(prevLeadId)} isDisabled={!prevLeadId}>
                  {Translations.LeadPrevLeadButton[DEFAULT_LANGUAGE]}
                </Button>
                <Button variant="secondary" onPress={() => goToLead(nextLeadId)} isDisabled={!nextLeadId}>
                  {Translations.LeadNextLeadButton[DEFAULT_LANGUAGE]}
                </Button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <DatePicker
                  label="Callback date"
                  value={callbackDate ? parseDate(callbackDate) : undefined}
                  onChange={(value) => setCallbackDate(value?.toString())}
                />
                <TextField
                  label="Callback time"
                  value={callbackTime}
                  onChange={setCallbackTime}
                  placeholder="09:00"
                  width={140}
                />
              </div>
            </div>
          </div>
        )}
        <Form update={update} id={id} />
      </div>
    </Item>,
  ];

  if (id) {
    tabs.push(
      <Item key="booking">
        <span className="tab-title">{Translations.BookMeetingTab[DEFAULT_LANGUAGE]}</span>
      </Item>
    );
    tabs.push(
      <Item key="emails">
        <span className="tab-title">{Translations.EmailTab[DEFAULT_LANGUAGE]}</span>
      </Item>
    );
    panels.push(
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
    );
    panels.push(
      <Item key="emails">
        <div style={{ padding: '15px', display: 'grid', gap: '16px' }}>
          <EmailComposer
            entityType="lead"
            entityId={id}
            defaultTo={lead?.contact?.email}
          />
          <EmailLogList entityType="lead" entityId={id} showSync />
        </div>
      </Item>
    );
  }

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
          <TabList>{tabs}</TabList>
          <TabPanels>{panels}</TabPanels>
        </Tabs>
      </div>
    </div>
  );
};
