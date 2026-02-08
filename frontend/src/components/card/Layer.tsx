import { Button, Tabs, TabList, Item, TabPanels } from '@adobe/react-spectrum';
import { useSelector } from 'react-redux';
import {
  ActionType,
  addAccount,
  addCard,
  hideLayer,
  updateCardFromServer,
  showModalSuccess,
  updateCard,
  showModalError,
} from '../../actions/Actions';
import {
  selectActiveUsers,
  selectCard,
  selectInterfaceStateId,
  selectLanes,
  selectToken,
  store,
} from '../../store/Store';
import { Form } from './Form';
import { Events } from './Events';
import { Card, CardPreview } from '../../interfaces/Card';
import { useEffect, useState } from 'react';
import { ApplicationStore } from '../../store/ApplicationStore';
import { Avatar } from '../Avatar';
import { User } from '../../interfaces/User';
import { Translations } from '../../Translations';
import { DEFAULT_LANGUAGE } from '../../Constants';
import useMobileLayout from '../../hooks/useMobileLayout';
import { getRequestClient } from '../../helpers/RequestHelper';
import { SchemaHelper } from '../../helpers/SchemaHelper';
import { SchemaType } from '../../interfaces/Schema';
import { selectSchemaByType, selectRoles, selectSessionUser } from '../../store/Store';
import { hasPermission } from '../../helpers/PermissionHelper';
import { EmailComposer } from '../email/EmailComposer';
import { EmailLogList } from '../email/EmailLogList';

export const Layer = () => {
  const token = useSelector(selectToken);

  const client = getRequestClient(token);

  const id = useSelector(selectInterfaceStateId);
  const card = useSelector((store: ApplicationStore) => selectCard(store, id));
  const [isUserLayerVisible, setIsUserLayerVisible] = useState(false);
  const users = useSelector(selectActiveUsers);
  const lanes = useSelector(selectLanes);
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);
  const schema = useSelector((store: ApplicationStore) =>
    selectSchemaByType(store, SchemaType.Card)
  );
  const isMobileLayout = useMobileLayout();

  const hideCardDetail = () => {
    store.dispatch(hideLayer());
  };

  const assign = async (id: User['_id']) => {
    console.log(`assign card to user ${id}`);

    store.dispatch({
      type: ActionType.CARD_UPDATE,
      payload: { ...card!, userId: id },
    });

    setIsUserLayerVisible(false);
  };

  const update = async (id: Card['_id'] | undefined, preview: CardPreview) => {
    if (id) {
      store.dispatch(updateCard({ ...card!, ...preview }));

      // TODO combine both dispatch to one
      store.dispatch(showModalSuccess(Translations.CardUpdatedConfirmation[DEFAULT_LANGUAGE]));
    } else {
      if (!preview.laneId) {
        preview.laneId = lanes[0]._id;
      }

      const updated = await client.createCard(preview); // TODO refactor

      // TODO combine both dispatch to one
      store.dispatch(addCard({ ...updated }));

      store.dispatch(showModalSuccess(Translations.CardCreatedConfirmation[DEFAULT_LANGUAGE]));
    }
  };

  useEffect(() => {
    const execute = async () => {
      const updated = await client.getCard(id!);

      store.dispatch(updateCardFromServer(updated));
    };

    if (id) {
      execute();
    }
  }, [id]);

  const accountReference = schema?.attributes?.find((attribute) => {
    return SchemaHelper.isReferenceAttribute(attribute) && attribute.entity === SchemaType.Account;
  });

  const linkedAccountId = accountReference
    ? card?.attributes?.[accountReference.key]
    : undefined;
  const canCreateAccount = hasPermission(sessionUser, roles, 'accounts', 'add');

  const createAccount = async () => {
    if (!id) {
      return;
    }

    try {
      const response = await client.convertCardToAccount(id);

      if (response?.account) {
        store.dispatch(addAccount(response.account));
      }

      if (response?.card) {
        store.dispatch(updateCardFromServer(response.card));
      }

      store.dispatch(showModalSuccess(Translations.AccountCreatedConfirmation[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const tabListItems: JSX.Element[] = [
    <Item key="opportunity">
      <span className="tab-title">{Translations.OpportunityTab[DEFAULT_LANGUAGE]}</span>
    </Item>,
  ];
  const tabPanelsItems: JSX.Element[] = [
    <Item key="opportunity">
      <Form update={update} id={id} />
    </Item>,
  ];

  if (id) {
    tabListItems.push(
      <Item key="events">
        <span className="tab-title">{Translations.HistoryTab[DEFAULT_LANGUAGE]}</span>
      </Item>
    );
    tabListItems.push(
      <Item key="emails">
        <span className="tab-title">{Translations.EmailTab[DEFAULT_LANGUAGE]}</span>
      </Item>
    );
    tabPanelsItems.push(
      <Item key="events">
        <Events entity="card" id={id} />
      </Item>
    );
    tabPanelsItems.push(
      <Item key="emails">
        <div style={{ padding: '15px', display: 'grid', gap: '16px' }}>
          <EmailComposer entityType="opportunity" entityId={id} />
          <EmailLogList entityType="opportunity" entityId={id} showSync />
        </div>
      </Item>
    );
  }

  return (
    <div className={`layer ${isMobileLayout ? 'mobile' : 'desktop'}`}>
      <div className="header">
        <div>
          {card?.userId && (
            <Avatar
              id={card?.userId}
              width={36}
              onClick={() => {
                setIsUserLayerVisible(!isUserLayerVisible);
              }}
            />
          )}
        </div>

        <div>
          <Button variant="primary" onPress={() => hideCardDetail()}>
            {Translations.CloseButton[DEFAULT_LANGUAGE]}
          </Button>
        </div>
        {id && !linkedAccountId && canCreateAccount && (
          <div>
            <Button variant="secondary" onPress={createAccount}>
              {Translations.ConvertOpportunityToAccountButton[DEFAULT_LANGUAGE]}
            </Button>
          </div>
        )}
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
          <TabPanels UNSAFE_style={{ padding: 0, border: 0 }}>{tabPanelsItems}</TabPanels>
        </Tabs>
      </div>
    </div>
  );
};
