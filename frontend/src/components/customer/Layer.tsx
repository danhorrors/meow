import { Button, Item, TabList, TabPanels, Tabs } from '@adobe/react-spectrum';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  addCustomer,
  hideLayer,
  showModalError,
  showModalSuccess,
  updateCustomer,
} from '../../actions/Actions';
import { Customer, CustomerPreview } from '../../interfaces/Customer';
import { ApplicationStore } from '../../store/ApplicationStore';
import {
  selectActiveUsers,
  selectCustomer,
  selectInterfaceStateId,
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
import { EmailComposer } from '../email/EmailComposer';
import { EmailLogList } from '../email/EmailLogList';

export const Layer = () => {
  const token = useSelector(selectToken);
  const client = getRequestClient(token);
  const id = useSelector(selectInterfaceStateId);
  const customer = useSelector((store: ApplicationStore) => selectCustomer(store, id));
  const users = useSelector(selectActiveUsers);
  const isMobileLayout = useMobileLayout();
  const [isUserLayerVisible, setIsUserLayerVisible] = useState(false);

  const hideCustomerDetail = () => {
    store.dispatch(hideLayer());
  };

  const update = async (id: Customer['_id'] | undefined, preview: CustomerPreview) => {
    try {
      if (id) {
        const updated = await client.updateCustomer({ ...customer!, ...preview });
        store.dispatch(updateCustomer({ ...updated }));
        store.dispatch(showModalSuccess(Translations.CustomerUpdatedConfirmation[DEFAULT_LANGUAGE]));
      } else {
        const created = await client.createCustomer(preview);
        store.dispatch(addCustomer({ ...created }));
        store.dispatch(showModalSuccess(Translations.CustomerCreatedConfirmation[DEFAULT_LANGUAGE]));
      }
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const assign = async (userId: User['_id']) => {
    if (!customer) {
      return;
    }

    try {
      const updated = await client.updateCustomer({ ...customer, userId });
      store.dispatch(updateCustomer({ ...updated }));
      setIsUserLayerVisible(false);
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const tabListItems: JSX.Element[] = [
    <Item key="customer">
      <span className="tab-title">{Translations.CustomerTab[DEFAULT_LANGUAGE]}</span>
    </Item>,
  ];
  const tabPanelsItems: JSX.Element[] = [
    <Item key="customer">
      <Form update={update} id={id} />
    </Item>,
  ];

  if (id) {
    tabListItems.push(
      <Item key="emails">
        <span className="tab-title">{Translations.EmailTab[DEFAULT_LANGUAGE]}</span>
      </Item>
    );
    tabPanelsItems.push(
      <Item key="emails">
        <div style={{ padding: '15px', display: 'grid', gap: '16px' }}>
          <EmailComposer
            entityType="customer"
            entityId={id}
            defaultTo={customer?.contact?.email}
          />
          <EmailLogList entityType="customer" entityId={id} showSync />
        </div>
      </Item>
    );
  }

  return (
    <div className={`layer ${isMobileLayout ? 'mobile' : 'desktop'}`}>
      <div className="header">
        <div>
          {customer?.userId && (
            <Avatar
              id={customer?.userId}
              width={36}
              onClick={() => setIsUserLayerVisible(!isUserLayerVisible)}
            />
          )}
        </div>

        <div>
          <Button variant="primary" onPress={() => hideCustomerDetail()}>
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
          <TabList>{tabListItems}</TabList>
          <TabPanels>{tabPanelsItems}</TabPanels>
        </Tabs>
      </div>
    </div>
  );
};
