import { Button, Item, Picker } from '@adobe/react-spectrum';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { ListView } from '../../interfaces/ListView';
import { ListName } from '../../store/ApplicationStore';
import { selectSessionUser, selectToken, store } from '../../store/Store';
import { getRequestClient } from '../../helpers/RequestHelper';
import { showModalError, showModalSuccess, ActionType } from '../../actions/Actions';
import { Translations } from '../../Translations';
import { DEFAULT_LANGUAGE } from '../../Constants';
import { getErrorMessage } from '../../helpers/ErrorHelper';

export interface ListViewSavedProps {
  name: ListName;
  current: ListView;
  onApply: (view: ListView) => void;
}

export const ListViewSaved = ({ name, current, onApply }: ListViewSavedProps) => {
  const user = useSelector(selectSessionUser);
  const token = useSelector(selectToken);
  const client = getRequestClient(token);
  const [selected, setSelected] = useState<string>('');

  const saved = useMemo(() => {
    const list = user?.views?.[name] || {};
    return Object.entries(list).map(([label, view]) => ({ label, view }));
  }, [user, name]);

  const saveView = async () => {
    if (!user) {
      return;
    }

    const label = prompt('Save view as:');
    if (!label) {
      return;
    }

    try {
      const updated = await client.saveUserView(user._id, {
        name,
        label,
        view: current,
      });

      store.dispatch({
        type: ActionType.USER_SETTINGS_UPDATE,
        payload: updated,
      });

      store.dispatch(showModalSuccess(Translations.SetupChangedConfirmation[DEFAULT_LANGUAGE]));
    } catch (error) {
      const message = await getErrorMessage(error);
      store.dispatch(showModalError(message));
    }
  };

  const applyView = (label: string) => {
    setSelected(label);
    const item = saved.find((view) => view.label === label);
    if (item?.view) {
      onApply(item.view as ListView);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Picker
        width={200}
        aria-label="Saved Views"
        selectedKey={selected}
        onSelectionChange={(key) => applyView(key.toString())}
      >
        <Item key="">{Translations.SavedViewsLabel[DEFAULT_LANGUAGE]}</Item>
        {saved.map((view) => (
          <Item key={view.label}>{view.label}</Item>
        ))}
      </Picker>
      <Button variant="secondary" onPress={saveView}>
        {Translations.SaveViewButton[DEFAULT_LANGUAGE]}
      </Button>
    </div>
  );
};
