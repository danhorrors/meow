import { Button } from '@adobe/react-spectrum';
import { useEffect, useMemo } from 'react';
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

  const rows = useMemo(() => {
    const list = toDataRows(leads);

    return ListViewHelper.filterAndOrder(list, columns, view);
  }, [schema, view, leads, columns]);

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
