import { Button, Picker, Item, TextField } from '@adobe/react-spectrum';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { ActionType, showModalError, showModalSuccess } from '../../../actions/Actions';
import { DEFAULT_LANGUAGE } from '../../../Constants';
import { Integration } from '../../../interfaces/Team';
import { getRequestClient } from '../../../helpers/RequestHelper';
import { selectTeam, selectToken, store } from '../../../store/Store';
import { Translations } from '../../../Translations';

const MAILGUN_KEY = 'mailgun';

export const MailgunCanvas = () => {
  const token = useSelector(selectToken);
  const team = useSelector(selectTeam);
  const client = getRequestClient(token);

  const integration = useMemo<Integration | undefined>(() => {
    return team?.integrations?.find((item) => item.key === MAILGUN_KEY);
  }, [team]);

  const [domain, setDomain] = useState<string>(
    (integration?.attributes?.domain as string | undefined) || ''
  );
  const [apiKey, setApiKey] = useState<string>(
    (integration?.attributes?.apiKey as string | undefined) || ''
  );
  const [sender, setSender] = useState<string>(
    (integration?.attributes?.sender as string | undefined) || ''
  );
  const [region, setRegion] = useState<'us' | 'eu'>(
    ((integration?.attributes?.region as string | undefined) || 'us') === 'eu' ? 'eu' : 'us'
  );

  const save = async () => {
    if (!team) {
      return;
    }

    try {
      const payload = await client.updateIntegration(team._id, {
        key: MAILGUN_KEY,
        attributes: {
          domain,
          apiKey,
          sender,
          region,
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
          <h2>{Translations.MailgunTitle[DEFAULT_LANGUAGE]}</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
        <TextField
          label={Translations.MailgunDomainLabel[DEFAULT_LANGUAGE]}
          value={domain}
          onChange={setDomain}
          width="100%"
        />
        <TextField
          label={Translations.MailgunApiKeyLabel[DEFAULT_LANGUAGE]}
          value={apiKey}
          onChange={setApiKey}
          width="100%"
          type="password"
        />
        <TextField
          label={Translations.MailgunSenderLabel[DEFAULT_LANGUAGE]}
          value={sender}
          onChange={setSender}
          width="100%"
        />
        <Picker
          width={200}
          selectedKey={region}
          onSelectionChange={(key) => setRegion(key.toString() as 'us' | 'eu')}
        >
          <Item key="us">{Translations.MailgunRegionUS[DEFAULT_LANGUAGE]}</Item>
          <Item key="eu">{Translations.MailgunRegionEU[DEFAULT_LANGUAGE]}</Item>
        </Picker>
      </div>

      <div style={{ marginTop: '16px' }}>
        <Button variant="primary" onPress={save}>
          {Translations.SaveButton[DEFAULT_LANGUAGE]}
        </Button>
      </div>
    </div>
  );
};
