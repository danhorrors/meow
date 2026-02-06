import { Button, Item, Picker } from '@adobe/react-spectrum';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { PermissionDenied } from '../components/PermissionDenied';
import { getRequestClient } from '../helpers/RequestHelper';
import { hasPermission } from '../helpers/PermissionHelper';
import { selectRoles, selectSessionUser, selectToken } from '../store/Store';
import { Translations } from '../Translations';
import { DEFAULT_LANGUAGE } from '../Constants';

type DuplicateGroup<T> = { key: string; items: T[] };

export const DuplicatesPage = () => {
  const token = useSelector(selectToken);
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);
  const client = getRequestClient(token);

  const canLeadBrowse = hasPermission(sessionUser, roles, 'leads', 'browse');
  const canAccountBrowse = hasPermission(sessionUser, roles, 'accounts', 'browse');
  const canLeadMerge =
    hasPermission(sessionUser, roles, 'leads', 'edit') &&
    hasPermission(sessionUser, roles, 'leads', 'delete');
  const canAccountMerge =
    hasPermission(sessionUser, roles, 'accounts', 'edit') &&
    hasPermission(sessionUser, roles, 'accounts', 'delete');

  const [view, setView] = useState<'leads' | 'accounts'>('leads');
  const [leadGroups, setLeadGroups] = useState<DuplicateGroup<any>[]>([]);
  const [accountGroups, setAccountGroups] = useState<DuplicateGroup<any>[]>([]);

  const load = async () => {
    if (view === 'leads' && canLeadBrowse) {
      const leads = await client.getLeadDuplicates();
      setLeadGroups(leads);
    }
    if (view === 'accounts' && canAccountBrowse) {
      const accounts = await client.getAccountDuplicates();
      setAccountGroups(accounts);
    }
  };

  useEffect(() => {
    load();
  }, [view]);

  if (!canLeadBrowse && !canAccountBrowse) {
    return <PermissionDenied />;
  }

  const merge = async (primaryId: string, duplicateId: string) => {
    if (view === 'leads') {
      await client.mergeLeadDuplicates({ primaryId, duplicateId, strategy: 'merge' });
    } else {
      await client.mergeAccountDuplicates({ primaryId, duplicateId, strategy: 'merge' });
    }

    await load();
  };

  const groups = view === 'leads' ? leadGroups : accountGroups;
  const canMerge = view === 'leads' ? canLeadMerge : canAccountMerge;

  return (
    <div className="canvas">
      <div className="list-view-header">
        <div>
          <h2>{Translations.DuplicatesTitle[DEFAULT_LANGUAGE]}</h2>
        </div>
        <div className="toolbar">
          <Picker
            width={200}
            selectedKey={view}
            onSelectionChange={(key) => setView(key.toString() as 'leads' | 'accounts')}
            items={[
              ...(canLeadBrowse
                ? [{ key: 'leads', label: Translations.LeadsTitle[DEFAULT_LANGUAGE] }]
                : []),
              ...(canAccountBrowse
                ? [{ key: 'accounts', label: Translations.AccountsTitle[DEFAULT_LANGUAGE] }]
                : []),
            ]}
          >
            {(item) => <Item key={item.key}>{item.label}</Item>}
          </Picker>
        </div>
      </div>

      <div className="content-box" style={{ overflow: 'auto' }}>
        {groups.length === 0 && (
          <div style={{ padding: '10px' }}>
            {Translations.NoDuplicatesLabel[DEFAULT_LANGUAGE]}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.key} style={{ marginBottom: '20px' }}>
            <div style={{ padding: '8px 0' }}>
              <b>{Translations.DuplicateKeyLabel[DEFAULT_LANGUAGE]}:</b> {group.key}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>{Translations.NameLabel[DEFAULT_LANGUAGE]}</th>
                  <th style={{ textAlign: 'left' }}>{Translations.CreatedAtLabel[DEFAULT_LANGUAGE]}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item: any, index: number) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.createdAt}</td>
                    <td style={{ textAlign: 'right' }}>
                      {canMerge && index > 0 && (
                        <Button
                          variant="cta"
                          onPress={() => merge(group.items[0]._id, item._id)}
                        >
                          {Translations.MergeButton[DEFAULT_LANGUAGE]}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};
