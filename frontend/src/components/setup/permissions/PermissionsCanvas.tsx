import { Button, Checkbox, Item, Picker, TextField } from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { ActionType, showModalError, showModalSuccess } from '../../../actions/Actions';
import { DEFAULT_LANGUAGE } from '../../../Constants';
import { getRequestClient } from '../../../helpers/RequestHelper';
import { PermissionAction, PermissionModule, Role, RolePermissions } from '../../../interfaces/Role';
import { User } from '../../../interfaces/User';
import { ApplicationStore } from '../../../store/ApplicationStore';
import { selectRoles, selectSessionUser, selectToken, selectUsers, store } from '../../../store/Store';
import { Translations } from '../../../Translations';
import { hasPermission } from '../../../helpers/PermissionHelper';

const MODULES: { key: PermissionModule; label: string }[] = [
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'leads', label: 'Leads' },
  { key: 'users', label: 'Users' },
  { key: 'settings', label: 'Settings' },
  { key: 'forecast', label: 'Forecast' },
  { key: 'activity', label: 'Activity' },
] as const;

const ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'browse', label: 'Browse' },
  { key: 'read', label: 'Read' },
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'assign', label: 'Assign' },
] as const;

const buildEmptyPermissions = (): RolePermissions => {
  const permissions: RolePermissions = {};
  MODULES.forEach((module) => {
    permissions[module.key] = {};
    ACTIONS.forEach((action) => {
      (permissions[module.key] as any)[action.key] = false;
    });
  });
  return permissions;
};

export const PermissionsCanvas = () => {
  const token = useSelector(selectToken);
  const roles = useSelector(selectRoles);
  const users = useSelector(selectUsers);
  const sessionUser = useSelector(selectSessionUser);

  const client = getRequestClient(token);

  const canEdit = useMemo(
    () => hasPermission(sessionUser, roles, 'settings', 'edit'),
    [sessionUser, roles]
  );

  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const [draftRole, setDraftRole] = useState<Partial<Role> | undefined>(undefined);

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0]._id);
    }
  }, [roles]);

  useEffect(() => {
    const role = roles.find((item) => item._id === selectedRoleId);
    if (role) {
      setDraftRole({ ...role, permissions: { ...role.permissions } });
    }
  }, [selectedRoleId, roles]);

  const updatePermission = (
    moduleKey: PermissionModule,
    actionKey: PermissionAction,
    value: boolean
  ) => {
    if (!draftRole) {
      return;
    }

    const updatedPermissions = {
      ...(draftRole.permissions || buildEmptyPermissions()),
    } as RolePermissions;

    if (!updatedPermissions[moduleKey]) {
      updatedPermissions[moduleKey] = {};
    }

    (updatedPermissions[moduleKey] as any)[actionKey] = value;

    setDraftRole({
      ...draftRole,
      permissions: updatedPermissions,
    });
  };

  const createNewRole = () => {
    const newRole: Partial<Role> = {
      name: 'New Role',
      permissions: buildEmptyPermissions(),
      isDefault: false,
    };
    setDraftRole(newRole);
    setSelectedRoleId(undefined);
  };

  const saveRole = async () => {
    if (!draftRole?.name || !draftRole.permissions) {
      return;
    }

    try {
      const saved = await client.upsertRole(draftRole);
      const updated = await client.getRoles();
      store.dispatch({
        type: ActionType.ROLES,
        payload: [...updated],
      });
      setSelectedRoleId(saved._id);
      store.dispatch(showModalSuccess(Translations.SetupChangedConfirmation[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const deleteRole = async () => {
    if (!draftRole?._id) {
      return;
    }

    try {
      await client.deleteRole(draftRole._id);
      const updated = await client.getRoles();
      store.dispatch({
        type: ActionType.ROLES,
        payload: [...updated],
      });
      setSelectedRoleId(updated[0]?._id);
      store.dispatch(showModalSuccess(Translations.SetupChangedConfirmation[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const updateUserRole = async (user: User, roleId: string) => {
    try {
      await client.updateUser({ ...user, roleId });
      const updatedUsers = await client.getUsers();
      store.dispatch({
        type: ActionType.USERS,
        payload: [...updatedUsers],
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
          <h2>{Translations.PermissionsTitle[DEFAULT_LANGUAGE]}</h2>
        </div>
      </div>

      {!canEdit && (
        <div style={{ marginBottom: '12px' }}>
          {Translations.PermissionDeniedText[DEFAULT_LANGUAGE]}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
        <Picker
          width="260px"
          selectedKey={selectedRoleId}
          onSelectionChange={(key) => setSelectedRoleId(key.toString())}
          aria-label={Translations.RolesTitle[DEFAULT_LANGUAGE]}
          isDisabled={!canEdit}
        >
          {roles.map((role) => (
            <Item key={role._id}>{role.name}</Item>
          ))}
        </Picker>
        <Button variant="primary" onPress={createNewRole} isDisabled={!canEdit}>
          {Translations.NewRoleButton[DEFAULT_LANGUAGE]}
        </Button>
        <Button variant="cta" onPress={deleteRole} isDisabled={!canEdit || !draftRole?._id}>
          {Translations.DeleteRoleButton[DEFAULT_LANGUAGE]}
        </Button>
      </div>

      <div style={{ marginBottom: '12px', maxWidth: '360px' }}>
        <TextField
          label={Translations.RoleNameLabel[DEFAULT_LANGUAGE]}
          value={draftRole?.name || ''}
          onChange={(value) => setDraftRole({ ...draftRole, name: value })}
          isDisabled={!canEdit}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Checkbox
          isSelected={draftRole?.isDefault === true}
          onChange={(value) => setDraftRole({ ...draftRole, isDefault: value })}
          isDisabled={!canEdit}
        >
          {Translations.DefaultRoleLabel[DEFAULT_LANGUAGE]}
        </Checkbox>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: '8px' }}>
                {Translations.ModuleLabel[DEFAULT_LANGUAGE]}
              </th>
              {ACTIONS.map((action) => (
                <th key={action.key} style={{ textAlign: 'left', paddingBottom: '8px' }}>
                  {action.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((module) => (
              <tr key={module.key}>
                <td style={{ paddingBottom: '6px' }}>{module.label}</td>
                {ACTIONS.map((action) => (
                  <td key={`${module.key}-${action.key}`} style={{ paddingBottom: '6px' }}>
                    <Checkbox
                      isSelected={
                        (draftRole?.permissions as any)?.[module.key]?.[action.key] === true
                      }
                      onChange={(value) => updatePermission(module.key, action.key, value)}
                      isDisabled={!canEdit}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '16px' }}>
        <Button variant="primary" onPress={saveRole} isDisabled={!canEdit}>
          {Translations.SaveRoleButton[DEFAULT_LANGUAGE]}
        </Button>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3>{Translations.AssignRoleLabel[DEFAULT_LANGUAGE]}</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td style={{ paddingBottom: '8px' }}>
                  <b>{user.name}</b>
                </td>
                <td style={{ paddingBottom: '8px' }}>
                  <Picker
                    width="260px"
                    selectedKey={user.roleId || ''}
                    onSelectionChange={(key) => updateUserRole(user, key.toString())}
                    isDisabled={!canEdit}
                  >
                    {roles.map((role) => (
                      <Item key={role._id}>{role.name}</Item>
                    ))}
                  </Picker>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
