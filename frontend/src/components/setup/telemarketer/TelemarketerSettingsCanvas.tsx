import { Button, Switch, TextArea, TextField } from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { ActionType, showModalError, showModalSuccess } from '../../../actions/Actions';
import { DEFAULT_LANGUAGE } from '../../../Constants';
import { Integration } from '../../../interfaces/Team';
import { getRequestClient } from '../../../helpers/RequestHelper';
import { selectTeam, selectToken, store } from '../../../store/Store';
import { Translations } from '../../../Translations';

const TELE_SETTINGS_KEY = 'telemarketer_settings';

const parseBool = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return value.toString() === 'true';
};

const defaultScripts = {
  intro: 'Hi {{name}}, it’s {{agent}}. I’m calling because we help teams follow up faster and keep every lead on track. Do you have 30 seconds?',
  followup: 'Hi {{name}}, just following up. We streamline outreach and visibility so nothing is missed. Would a quick call be helpful?',
  voicemail: 'Hi {{name}}, it’s {{agent}}. I’m calling about improving follow-up speed and visibility. I’ll send a quick email too. Thanks.',
};

export const TelemarketerSettingsCanvas = () => {
  const token = useSelector(selectToken);
  const team = useSelector(selectTeam);
  const client = getRequestClient(token);

  const integration = useMemo<Integration | undefined>(() => {
    return team?.integrations?.find((item) => item.key === TELE_SETTINGS_KEY);
  }, [team]);

  const [enableQuickActions, setEnableQuickActions] = useState(true);
  const [enableAutoAdvance, setEnableAutoAdvance] = useState(true);
  const [autoAdvanceOutcomesOnly, setAutoAdvanceOutcomesOnly] = useState(true);
  const [autoAdvanceOutcomes, setAutoAdvanceOutcomes] = useState('Call back, No answer');
  const [enableScripts, setEnableScripts] = useState(true);
  const [enableCallTimer, setEnableCallTimer] = useState(true);
  const [enableOutcomesDashboard, setEnableOutcomesDashboard] = useState(true);
  const [enableLeadQueue, setEnableLeadQueue] = useState(true);
  const [scriptsJson, setScriptsJson] = useState(JSON.stringify(defaultScripts, null, 2));

  useEffect(() => {
    if (!token) return;
    client
      .getIntegration(TELE_SETTINGS_KEY)
      .then((payload) => {
        const attrs = payload?.attributes || {};
        setEnableQuickActions(parseBool(attrs.enableQuickActions, true));
        setEnableAutoAdvance(parseBool(attrs.enableAutoAdvance, true));
        setAutoAdvanceOutcomesOnly(parseBool(attrs.autoAdvanceOutcomesOnly, true));
        setAutoAdvanceOutcomes((attrs.autoAdvanceOutcomes as string) || 'Call back, No answer');
        setEnableScripts(parseBool(attrs.enableScripts, true));
        setEnableCallTimer(parseBool(attrs.enableCallTimer, true));
        setEnableOutcomesDashboard(parseBool(attrs.enableOutcomesDashboard, true));
        setEnableLeadQueue(parseBool(attrs.enableLeadQueue, true));
        setScriptsJson((attrs.scriptsJson as string) || JSON.stringify(defaultScripts, null, 2));
      })
      .catch(() => undefined);
  }, [token]);

  const save = async () => {
    if (!team) return;
    try {
      const payload = await client.updateIntegration(team._id, {
        key: TELE_SETTINGS_KEY,
        attributes: {
          enableQuickActions,
          enableAutoAdvance,
          autoAdvanceOutcomesOnly,
          autoAdvanceOutcomes,
          enableScripts,
          enableCallTimer,
          enableOutcomesDashboard,
          enableLeadQueue,
          scriptsJson,
        },
      });

      store.dispatch({
        type: ActionType.TEAM_UPDATE,
        payload: { ...team, integrations: payload.integrations },
      });
      store.dispatch(showModalSuccess(Translations.SetupChangedConfirmation[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  return (
    <div className="content-box">
      <div className="schema-editor-header">
        <div className="title">
          <h2>{Translations.TelemarketerSettingsTitle[DEFAULT_LANGUAGE]}</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gap: '12px', maxWidth: '720px' }}>
        <Switch isSelected={enableQuickActions} onChange={setEnableQuickActions}>
          {Translations.TelemarketerQuickActionsToggle[DEFAULT_LANGUAGE]}
        </Switch>
        <Switch isSelected={enableScripts} onChange={setEnableScripts}>
          {Translations.TelemarketerScriptsToggle[DEFAULT_LANGUAGE]}
        </Switch>
        <Switch isSelected={enableCallTimer} onChange={setEnableCallTimer}>
          {Translations.TelemarketerCallTimerToggle[DEFAULT_LANGUAGE]}
        </Switch>
        <Switch isSelected={enableLeadQueue} onChange={setEnableLeadQueue}>
          {Translations.TelemarketerQueueToggle[DEFAULT_LANGUAGE]}
        </Switch>
        <Switch isSelected={enableOutcomesDashboard} onChange={setEnableOutcomesDashboard}>
          {Translations.TelemarketerDashboardToggle[DEFAULT_LANGUAGE]}
        </Switch>
        <Switch isSelected={enableAutoAdvance} onChange={setEnableAutoAdvance}>
          {Translations.TelemarketerAutoAdvanceToggle[DEFAULT_LANGUAGE]}
        </Switch>
        <Switch
          isSelected={autoAdvanceOutcomesOnly}
          onChange={setAutoAdvanceOutcomesOnly}
          isDisabled={!enableAutoAdvance}
        >
          {Translations.TelemarketerAutoAdvanceOutcomesOnlyToggle[DEFAULT_LANGUAGE]}
        </Switch>
        <TextField
          label={Translations.TelemarketerAutoAdvanceOutcomesLabel[DEFAULT_LANGUAGE]}
          value={autoAdvanceOutcomes}
          onChange={setAutoAdvanceOutcomes}
          width="100%"
          isDisabled={!enableAutoAdvance || !autoAdvanceOutcomesOnly}
        />
        <TextArea
          label={Translations.TelemarketerScriptsLabel[DEFAULT_LANGUAGE]}
          value={scriptsJson}
          onChange={setScriptsJson}
          width="100%"
          height="180px"
          isDisabled={!enableScripts}
        />
      </div>
      <div style={{ marginTop: '16px' }}>
        <Button variant="primary" onPress={save}>
          {Translations.SaveButton[DEFAULT_LANGUAGE]}
        </Button>
      </div>
    </div>
  );
};
