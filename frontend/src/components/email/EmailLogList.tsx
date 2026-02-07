import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getRequestClient } from '../../helpers/RequestHelper';
import { selectToken } from '../../store/Store';
import { EmailLog } from '../../interfaces/EmailLog';
import { toRelativeDate } from '../../helpers/DateHelper';
import { Translations } from '../../Translations';
import { DEFAULT_LANGUAGE } from '../../Constants';
import { Button } from '@adobe/react-spectrum';
import { showModalError, showModalSuccess } from '../../actions/Actions';
import { store } from '../../store/Store';

export interface EmailLogListProps {
  entityType?: string;
  entityId?: string;
  campaignId?: string;
  showSync?: boolean;
}

export const EmailLogList = ({ entityType, entityId, campaignId, showSync }: EmailLogListProps) => {
  const token = useSelector(selectToken);
  const client = getRequestClient(token);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    const list = await client.getEmails({ entityType, entityId, campaignId });
    setEmails(list || []);
  };

  useEffect(() => {
    load();
  }, [entityType, entityId, campaignId]);

  const syncInbox = async () => {
    try {
      setSyncing(true);
      await client.syncEmails();
      await load();
      store.dispatch(showModalSuccess(Translations.GoogleWorkspaceSyncSuccess[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    } finally {
      setSyncing(false);
    }
  };

  const hasInbound = useMemo(() => emails.some((email) => email.direction === 'inbound'), [emails]);

  if (!emails || emails.length === 0) {
    return (
      <div>
        {showSync && (
          <div style={{ marginBottom: '10px' }}>
            <Button variant="secondary" onPress={syncInbox} isDisabled={syncing}>
              {Translations.GoogleWorkspaceSyncButton[DEFAULT_LANGUAGE]}
            </Button>
          </div>
        )}
        {Translations.EmailLogEmptyLabel[DEFAULT_LANGUAGE]}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {showSync && (
        <div style={{ marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button variant="secondary" onPress={syncInbox} isDisabled={syncing}>
            {Translations.GoogleWorkspaceSyncButton[DEFAULT_LANGUAGE]}
          </Button>
          {hasInbound ? <span style={{ fontSize: '12px' }}>Inbound synced</span> : null}
        </div>
      )}
      {emails.map((email) => (
        <div key={email._id} style={{ padding: '10px', border: '1px solid #e4e4e4' }}>
          <div>
            <b>{email.subject}</b>
          </div>
          {email.direction === 'inbound' && email.from && (
            <div>
              {Translations.EmailFromLabel[DEFAULT_LANGUAGE]}: {email.from}
            </div>
          )}
          <div>
            {Translations.EmailToLabel[DEFAULT_LANGUAGE]}: {email.to?.join(', ')}
          </div>
          <div>
            {Translations.EmailStatusLabel[DEFAULT_LANGUAGE]}: {email.status}
          </div>
          <div>
            {Translations.EmailProviderLabel[DEFAULT_LANGUAGE]}: {email.provider}
          </div>
          <div>
            {email.direction === 'inbound'
              ? toRelativeDate(email.receivedAt || email.createdAt)
              : toRelativeDate(email.sentAt || email.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
};
