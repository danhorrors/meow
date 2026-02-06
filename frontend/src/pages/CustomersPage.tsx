import { Button } from '@adobe/react-spectrum';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ActionType, setListViewColumn, setListViewSortBy, showCustomerLayer } from '../actions/Actions';
import { Layer as CustomerLayer } from '../components/customer/Layer';
import {
  selectCustomers,
  selectInterfaceState,
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
import { Customer } from '../interfaces/Customer';
import { Item } from '../components/view/list/Item';
import { Row } from '../components/view/table/Row';
import { Layer as CardLayer } from '../components/card/Layer';
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

export const CustomersPage = () => {
  const state = useSelector(selectInterfaceState);
  const token = useSelector(selectToken);
  const customers = useSelector(selectCustomers);
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);
  const view = useSelector((store: ApplicationStore) => selectView(store, 'customers'));
  const columns = useSelector((store: ApplicationStore) => selectViewColumns(store, 'customers'));
  const isMobileLayout = useMobileLayout();

  const client = getRequestClient(token);

  const schema = useSelector((store: ApplicationStore) =>
    selectSchemaByType(store, SchemaType.Customer)
  );

  if (!hasPermission(sessionUser, roles, 'customers', 'browse')) {
    return <PermissionDenied />;
  }

  useEffect(() => {
    if (schema && columns.length === 0) {
      store.dispatch(setListViewColumn('customers', createListViewItemsFromSchema(schema)));
    }
  }, [schema]);

  const openCustomer = (id?: string) => {
    store.dispatch(showCustomerLayer(id));
  };

  const toDataRows = (list: Customer[]) => {
    return list.map((customer) => {
      const row: DataRow = {
        id: customer._id,
        name: customer.name,
        createdAt: customer.createdAt,
      };

      schema?.attributes.map(({ key }) => {
        row[key] = customer.attributes?.[key];
      });
      return row;
    });
  };

  const rows = useMemo(() => {
    const list = toDataRows(customers);

    return ListViewHelper.filterAndOrder(list, columns, view);
  }, [schema, view, customers, columns]);

  const deleteCustomer = async (id: string) => {
    const shouldDelete = confirm(Translations.DeleteCustomerConfirmation[DEFAULT_LANGUAGE]);

    if (!shouldDelete) {
      return;
    }

    try {
      await client.deleteCustomer(id);

      let customers = await client.getCustomers();

      store.dispatch({
        type: ActionType.CUSTOMERS,
        payload: [...customers],
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
            <span onClick={() => openCustomer(row.id?.toString())} className="direct-link">
              {row.name}
            </span>
          </td>
        );
      case 'createdAt':
        return <td>{toRelativeDate(row.createdAt)}</td>;
      case null:
        return (
          <td style={{ textAlign: 'right' }}>
            <Button variant="cta" onPress={() => deleteCustomer(row.id!.toString())}>
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
            <span onClick={() => openCustomer(row.id?.toString())} className="direct-link title">
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
            <Button variant="cta" onPress={() => deleteCustomer(row.id!.toString())}>
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
      {state === 'customer-detail' && <CustomerLayer />}
      {state === 'card-detail' && <CardLayer />}

      <div className="canvas">
        <div className="list-view-header">
          <div>
            <h2>
              {Translations.CustomersTitle[DEFAULT_LANGUAGE]} {rows.length}
            </h2>
            <div style={{ paddingLeft: '10px' }}>
              <Button variant="primary" onPress={() => openCustomer()}>
                {Translations.AddButton[DEFAULT_LANGUAGE]}
              </Button>
            </div>
          </div>
          <div className="toolbar">
            <ListViewSaved
              name="customers"
              current={view}
              onApply={(saved) => {
                store.dispatch(setListViewColumn('customers', saved.columns));
                store.dispatch(
                  setListViewSortBy(
                    'customers',
                    saved.sortBy.column ?? null,
                    saved.sortBy.direction
                  )
                );
                store.dispatch(setListViewFilterBy('customers', saved.filterBy.text || ''));
              }}
            />
            <ListSearchCanvas name="customers" />
            <ListFilterCanvas name="customers" columns={columns} />
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
              <TableHeader name="customers" sort={setListViewSortBy} view={view} columns={columns} />
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
