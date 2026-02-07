import { Button, TextField } from '@adobe/react-spectrum';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { ActionType, showModalError, showModalSuccess } from '../../../actions/Actions';
import { DEFAULT_LANGUAGE } from '../../../Constants';
import { Integration } from '../../../interfaces/Team';
import { getRequestClient } from '../../../helpers/RequestHelper';
import { selectTeam, selectToken, store } from '../../../store/Store';
import { Translations } from '../../../Translations';

const GOOGLE_WORKSPACE_KEY = 'google_workspace';

export const GoogleWorkspaceCanvas = () => {
  const token = useSelector(selectToken);
  const team = useSelector(selectTeam);
  const client = getRequestClient(token);

  const integration = useMemo<Integration | undefined>(() => {
    return team?.integrations?.find((item) => item.key === GOOGLE_WORKSPACE_KEY);
  }, [team]);

  const [clientId, setClientId] = useState<string>(
    (integration?.attributes?.clientId as string | undefined) || ''
  );
  const [clientSecret, setClientSecret] = useState<string>(
    (integration?.attributes?.clientSecret as string | undefined) || ''
  );
  const [redirectUri, setRedirectUri] = useState<string>(
    (integration?.attributes?.redirectUri as string | undefined) ||
      `${window.location.origin}/public/google-workspace/callback`
  );

  const save = async () => {
    if (!team) {
      return;
    }

    try {
      const payload = await client.updateIntegration(team._id, {
        key: GOOGLE_WORKSPACE_KEY,
        attributes: {
          clientId,
          clientSecret,
          redirectUri,
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
          <h2>{Translations.GoogleWorkspaceTitle[DEFAULT_LANGUAGE]}</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
        <TextField
          label={Translations.GoogleClientIdLabel[DEFAULT_LANGUAGE]}
          value={clientId}
          onChange={setClientId}
          width="100%"
        />
        <TextField
          label={Translations.GoogleClientSecretLabel[DEFAULT_LANGUAGE]}
          value={clientSecret}
          onChange={setClientSecret}
          width="100%"
          type="password"
        />
        <TextField
          label={Translations.GoogleRedirectUriLabel[DEFAULT_LANGUAGE]}
          value={redirectUri}
          onChange={setRedirectUri}
          width="100%"
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
