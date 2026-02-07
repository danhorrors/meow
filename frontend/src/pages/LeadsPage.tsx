import { Button } from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  ActionType,
  setListViewColumn,
  setListViewSortBy,
  showLeadLayer,
} from '../actions/Actions';
import { Layer as LeadLayer } from '../components/lead/Layer';
import {
  selectInterfaceState,
  selectLeads,
  selectSchemaByType,
  selectToken,
  selectView,
  selectViewColumns,
  store,
} from '../store/Store';
import { ListViewHelper } from '../helpers/ListViewHelper';
import { ApplicationStore } from '../store/ApplicationStore';
import { Schema, SchemaType } from '../interfaces/Schema';
import { toRelativeDate } from '../helpers/DateHelper';
import { ListViewItem, DataRow } from '../interfaces/ListView';
import { TableHeader } from '../components/view/table/TableHeader';
import { TableCanvas } from '../components/view/table/TableCanvas';
import { ListFilterCanvas } from '../components/view/ListFilterCanvas';
import { ListSearchCanvas } from '../components/view/ListSearchCanvas';
import useMobileLayout from '../hooks/useMobileLayout';
import { Lead } from '../interfaces/Lead';
import { Item } from '../components/view/list/Item';
import { Row } from '../components/view/table/Row';
import { Translations } from '../Translations';
import { DEFAULT_LANGUAGE } from '../Constants';
import { getRequestClient } from '../helpers/RequestHelper';
import { PermissionDenied } from '../components/PermissionDenied';
import { hasPermission } from '../helpers/PermissionHelper';
import { selectRoles, selectSessionUser } from '../store/Store';
import { ListViewSaved } from '../components/view/ListViewSaved';
import { setListViewFilterBy } from '../actions/Actions';

const TELE_SETTINGS_KEY = 'telemarketer_settings';

const parseBool = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return value.toString() === 'true';
};
const createListViewItemsFromSchema = (schema: Schema | undefined): ListViewItem[] => {
  const list: ListViewItem[] = [
    {
      name: Translations.NameLabel[DEFAULT_LANGUAGE],
      column: 'name',
      isHidden: false,
    },
  ];

  schema?.attributes.map((attribute) => {
    list.push({
      name: attribute.name,
      column: attribute.key,
      isHidden: false,
    });
  });

  list.push({
    name: Translations.CreatedAtLabel[DEFAULT_LANGUAGE],
    column: 'createdAt',
    isHidden: false,
  });

  list.push({
    name: null,
    column: null,
    isHidden: false,
  });

  return list;
};

export const LeadsPage = () => {
  const state = useSelector(selectInterfaceState);
  const token = useSelector(selectToken);
  const leads = useSelector(selectLeads);
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);
  const view = useSelector((store: ApplicationStore) => selectView(store, 'leads'));
  const columns = useSelector((store: ApplicationStore) => selectViewColumns(store, 'leads'));
  const isMobileLayout = useMobileLayout();
  const [queueFilter, setQueueFilter] = useState('all');
  const [teleSettings, setTeleSettings] = useState({
    enableOutcomesDashboard: true,
    enableLeadQueue: true,
  });

  const client = getRequestClient(token);

  const schema = useSelector((store: ApplicationStore) =>
    selectSchemaByType(store, SchemaType.Lead)
  );

  if (!hasPermission(sessionUser, roles, 'leads', 'browse')) {
    return <PermissionDenied />;
  }

  useEffect(() => {
    if (schema && columns.length === 0) {
      store.dispatch(setListViewColumn('leads', createListViewItemsFromSchema(schema)));
    }
  }, [schema]);

  useEffect(() => {
    if (!token) return;
    client
      .getIntegration(TELE_SETTINGS_KEY)
      .then((payload) => {
        const attrs = payload?.attributes || {};
        setTeleSettings({
          enableOutcomesDashboard: parseBool(attrs.enableOutcomesDashboard, true),
          enableLeadQueue: parseBool(attrs.enableLeadQueue, true),
        });
      })
      .catch(() => undefined);
  }, [token]);

  const openLead = (id?: string) => {
    store.dispatch(showLeadLayer(id));
  };

  const toDataRows = (list: Lead[]) => {
    return list.map((lead) => {
      const row: DataRow = {
        id: lead._id,
        name: lead.name,
        createdAt: lead.createdAt,
      };

      schema?.attributes.map(({ key }) => {
        row[key] = lead.attributes?.[key];
      });
      return row;
    });
  };

  const filteredLeads = useMemo(() => {
    if (!teleSettings.enableLeadQueue) {
      return leads;
    }
    const byQueue = (lead: Lead) => {
      const outcome = lead.attributes?.['lead-call-outcome']?.toString();
      const lastContacted = lead.attributes?.['lead-last-contacted'];
      switch (queueFilter) {
        case 'uncontacted':
          return !lastContacted;
        case 'callback':
          return outcome === 'Call back';
        case 'no-answer':
          return outcome === 'No answer';
        case 'voicemail':
          return outcome === 'Left voicemail';
        case 'has-phone':
          return Boolean(lead.contact?.phone);
        case 'has-email':
          return Boolean(lead.contact?.email);
        default:
          return true;
      }
    };
    return leads.filter(byQueue);
  }, [leads, queueFilter, teleSettings.enableLeadQueue]);

  const rows = useMemo(() => {
    const list = toDataRows(filteredLeads);

    return ListViewHelper.filterAndOrder(list, columns, view);
  }, [schema, view, filteredLeads, columns]);

  const outcomeStats = useMemo(() => {
    const stats: Record<string, number> = {
      Connected: 0,
      'Left voicemail': 0,
      'No answer': 0,
      'Wrong number': 0,
      'Call back': 0,
      'Not interested': 0,
    };
    let contacted = 0;
    let uncontacted = 0;
    leads.forEach((lead) => {
      const lastContacted = lead.attributes?.['lead-last-contacted'];
      if (lastContacted) {
        contacted += 1;
      } else {
        uncontacted += 1;
      }
      const outcome = lead.attributes?.['lead-call-outcome']?.toString() || '';
      if (stats[outcome] !== undefined) {
        stats[outcome] += 1;
      }
    });
    return { stats, contacted, uncontacted };
  }, [leads]);

  const deleteLead = async (id: string) => {
    const shouldDelete = confirm(Translations.DeleteLeadConfirmation[DEFAULT_LANGUAGE]);

    if (!shouldDelete) {
      return;
    }

    try {
      await client.deleteLead(id);

      let leads = await client.getLeads();

      store.dispatch({
        type: ActionType.LEADS,
        payload: [...leads],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const getCell = (row: DataRow, item: ListViewItem) => {
    switch (item.column) {
      case 'name':
        return (
          <td>
            <span onClick={() => openLead(row.id?.toString())} className="direct-link">
              {row.name}
            </span>
          </td>
        );
      case 'createdAt':
        return <td>{toRelativeDate(row.createdAt)}</td>;
      case null:
        return (
          <td style={{ textAlign: 'right' }}>
            <Button variant="cta" onPress={() => deleteLead(row.id!.toString())}>
              {Translations.DeleteButton[DEFAULT_LANGUAGE]}
            </Button>
          </td>
        );
      default:
        return <td>{item.column !== null && row[item.column]?.toString()}</td>;
    }
  };

  const getListItem = (row: DataRow, item: ListViewItem) => {
    switch (item.column) {
      case 'name':
        return (
          <div key={item.column}>
            <span onClick={() => openLead(row.id?.toString())} className="direct-link title">
              {row.name}
            </span>
          </div>
        );
      case 'createdAt':
        return (
          <div key={item.column}>
            <b>{Translations.CreatedLabel[DEFAULT_LANGUAGE]}</b> {toRelativeDate(row.createdAt)}
          </div>
        );
      case null:
        return (
          <div key="delete">
            <Button variant="cta" onPress={() => deleteLead(row.id!.toString())}>
              {Translations.DeleteButton[DEFAULT_LANGUAGE]}
            </Button>
          </div>
        );
      default:
        return item.column !== null && row[item.column] ? (
          <div key={item.column}>
            <b>{item.name}:</b> {row[item.column]}
          </div>
        ) : null;
    }
  };

  return (
    <>
      {state === 'lead-detail' && <LeadLayer />}

      <div className="canvas">
        <div className="list-view-header">
          <div>
            <h2>
              {Translations.LeadsTitle[DEFAULT_LANGUAGE]} {rows.length}
            </h2>
            <div style={{ paddingLeft: '10px' }}>
              <Button variant="primary" onPress={() => openLead()}>
                {Translations.AddButton[DEFAULT_LANGUAGE]}
              </Button>
            </div>
          </div>
          <div className="toolbar">
            <ListViewSaved
              name="leads"
              current={view}
              onApply={(saved) => {
                store.dispatch(setListViewColumn('leads', saved.columns));
                store.dispatch(
                  setListViewSortBy(
                    'leads',
                    saved.sortBy.column ?? null,
                    saved.sortBy.direction
                  )
                );
                store.dispatch(setListViewFilterBy('leads', saved.filterBy.text || ''));
              }}
            />
            <ListSearchCanvas name="leads" />
            <ListFilterCanvas name="leads" columns={columns} />
          </div>
        </div>
        {teleSettings.enableOutcomesDashboard && (
          <div
            className="content-box"
            style={{ marginBottom: '12px', padding: '12px 16px' }}
          >
            <div style={{ fontSize: '12px', color: '#9aa4bf', marginBottom: '8px' }}>
              Outcomes dashboard
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ background: '#151a23', padding: '8px 12px', borderRadius: '8px' }}>
                <b>{outcomeStats.contacted}</b> contacted
              </div>
              <div style={{ background: '#151a23', padding: '8px 12px', borderRadius: '8px' }}>
                <b>{outcomeStats.uncontacted}</b> uncontacted
              </div>
              {Object.entries(outcomeStats.stats).map(([key, value]) => (
                <div
                  key={key}
                  style={{ background: '#151a23', padding: '8px 12px', borderRadius: '8px' }}
                >
                  <b>{value}</b> {key}
                </div>
              ))}
            </div>
          </div>
        )}

        {teleSettings.enableLeadQueue && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: '#9aa4bf' }}>
              {Translations.LeadQueueFilterLabel[DEFAULT_LANGUAGE]}
            </span>
            <Button
              variant={queueFilter === 'all' ? 'primary' : 'secondary'}
              onPress={() => setQueueFilter('all')}
            >
              {Translations.LeadQueueAll[DEFAULT_LANGUAGE]}
            </Button>
            <Button
              variant={queueFilter === 'uncontacted' ? 'primary' : 'secondary'}
              onPress={() => setQueueFilter('uncontacted')}
            >
              {Translations.LeadQueueUncontacted[DEFAULT_LANGUAGE]}
            </Button>
            <Button
              variant={queueFilter === 'callback' ? 'primary' : 'secondary'}
              onPress={() => setQueueFilter('callback')}
            >
              {Translations.LeadQueueCallBack[DEFAULT_LANGUAGE]}
            </Button>
            <Button
              variant={queueFilter === 'no-answer' ? 'primary' : 'secondary'}
              onPress={() => setQueueFilter('no-answer')}
            >
              {Translations.LeadQueueNoAnswer[DEFAULT_LANGUAGE]}
            </Button>
            <Button
              variant={queueFilter === 'voicemail' ? 'primary' : 'secondary'}
              onPress={() => setQueueFilter('voicemail')}
            >
              {Translations.LeadQueueVoicemail[DEFAULT_LANGUAGE]}
            </Button>
            <Button
              variant={queueFilter === 'has-phone' ? 'primary' : 'secondary'}
              onPress={() => setQueueFilter('has-phone')}
            >
              {Translations.LeadQueueHasPhone[DEFAULT_LANGUAGE]}
            </Button>
            <Button
              variant={queueFilter === 'has-email' ? 'primary' : 'secondary'}
              onPress={() => setQueueFilter('has-email')}
            >
              {Translations.LeadQueueHasEmail[DEFAULT_LANGUAGE]}
            </Button>
          </div>
        )}

        {isMobileLayout ? (
          <div className="mobile-view">
            {rows.map((row, index) => {
              return (
                <Item key={index}>
                  {columns
                    .filter(({ isHidden }) => isHidden === false)
                    .map((item) => getListItem(row, item))}
                </Item>
              );
            })}
          </div>
        ) : (
          <div className="content-box" style={{ overflow: 'auto' }}>
            <TableCanvas>
              <TableHeader name="leads" sort={setListViewSortBy} view={view} columns={columns} />
              {rows.map((row, index) => {
                return (
                  <Row key={index}>
                    {columns
                      .filter(({ isHidden }) => isHidden === false)
                      .map((item) => getCell(row, item))}
                  </Row>
                );
              })}
            </TableCanvas>
          </div>
        )}
      </div>
    </>
  );
};
