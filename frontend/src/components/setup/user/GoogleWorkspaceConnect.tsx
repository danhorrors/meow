import { Button } from '@adobe/react-spectrum';
import { useSelector } from 'react-redux';
import { showModalError, showModalSuccess } from '../../../actions/Actions';
import { DEFAULT_LANGUAGE } from '../../../Constants';
import { getRequestClient } from '../../../helpers/RequestHelper';
import { selectSessionUser, selectToken, store } from '../../../store/Store';
import { Translations } from '../../../Translations';

export const GoogleWorkspaceConnect = () => {
  const token = useSelector(selectToken);
  const user = useSelector(selectSessionUser);
  const client = getRequestClient(token);

  const isConnected = user?.integrations?.some((integration) => integration.key === 'google_workspace');

  const connect = async () => {
    try {
      const { url } = await client.getGoogleWorkspaceAuthUrl();
      window.open(url, '_blank', 'width=600,height=700');
      store.dispatch(showModalSuccess(Translations.GoogleWorkspaceConnectedLabel[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const syncInbox = async () => {
    try {
      await client.syncEmails();
      store.dispatch(showModalSuccess(Translations.GoogleWorkspaceSyncSuccess[DEFAULT_LANGUAGE]));
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
      <div style={{ marginBottom: '10px' }}>
        {isConnected
          ? Translations.GoogleWorkspaceConnectedLabel[DEFAULT_LANGUAGE]
          : Translations.GoogleWorkspaceNotConnectedLabel[DEFAULT_LANGUAGE]}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Button variant="primary" onPress={connect}>
          {Translations.GoogleWorkspaceConnectButton[DEFAULT_LANGUAGE]}
        </Button>
        <Button variant="secondary" onPress={syncInbox} isDisabled={!isConnected}>
          {Translations.GoogleWorkspaceSyncButton[DEFAULT_LANGUAGE]}
        </Button>
      </div>
    </div>
  );
};
