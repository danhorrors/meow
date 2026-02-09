import { Button, Item, Picker, Switch, TextArea, TextField } from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { ActionType, showModalError, showModalSuccess } from '../../../actions/Actions';
import { getRequestClient } from '../../../helpers/RequestHelper';
import { selectTeam, selectToken, store } from '../../../store/Store';
import { Translations } from '../../../Translations';
import { DEFAULT_LANGUAGE } from '../../../Constants';
import { Team } from '../../../interfaces/Team';

type TemplateField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'number';
  isMultiline?: boolean;
};

type Template = {
  id: string;
  name: string;
  defaultKey: string;
  description: string;
  fields: TemplateField[];
};

type CustomField = {
  id: number;
  key: string;
  value: string;
};

const NEW_KEY = '__new__';

const templates: Template[] = [
  {
    id: 'rest',
    name: 'REST API',
    defaultKey: 'rest-api',
    description:
      'Connect a standard API using a base URL and token headers. Good default for most platforms.',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.example.com' },
      {
        key: 'authType',
        label: 'Auth Type',
        placeholder: 'api_key | bearer | basic | none',
      },
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'bearerToken', label: 'Bearer Token', type: 'password' },
      { key: 'username', label: 'Username' },
      { key: 'password', label: 'Password', type: 'password' },
      {
        key: 'headersJson',
        label: 'Extra Headers (JSON)',
        placeholder: '{\"X-Region\":\"eu\"}',
        isMultiline: true,
      },
      { key: 'timeoutMs', label: 'Timeout (ms)', type: 'number', placeholder: '8000' },
    ],
  },
  {
    id: 'webhook',
    name: 'Webhook',
    defaultKey: 'webhook',
    description:
      'Store webhook URL and signing values for systems that push events into your workflow.',
    fields: [
      { key: 'endpointUrl', label: 'Endpoint URL', placeholder: 'https://hooks.example.com/meow' },
      { key: 'method', label: 'Method', placeholder: 'POST' },
      { key: 'signingSecret', label: 'Signing Secret', type: 'password' },
      {
        key: 'headersJson',
        label: 'Headers (JSON)',
        placeholder: '{\"Content-Type\":\"application/json\"}',
        isMultiline: true,
      },
    ],
  },
  {
    id: 'oauth2',
    name: 'OAuth2 Service',
    defaultKey: 'oauth2-service',
    description:
      'Use for providers requiring OAuth client credentials and token endpoints.',
    fields: [
      { key: 'authUrl', label: 'Authorization URL', placeholder: 'https://provider.com/oauth/authorize' },
      { key: 'tokenUrl', label: 'Token URL', placeholder: 'https://provider.com/oauth/token' },
      { key: 'clientId', label: 'Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
      { key: 'redirectUri', label: 'Redirect URI', placeholder: 'https://app.example.com/callback' },
      { key: 'scope', label: 'Scopes', placeholder: 'read write profile' },
    ],
  },
];

const parseBool = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return value.toString() === 'true';
};

const slugifyKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const toInputValue = (value: unknown) => {
  if (value === undefined || value === null) return '';
  return value.toString();
};

export const ApiIntegrationsCanvas = () => {
  const token = useSelector(selectToken);
  const team = useSelector(selectTeam) as Team | undefined;
  const client = getRequestClient(token);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0].id);
  const [selectedIntegrationKey, setSelectedIntegrationKey] = useState<string>(NEW_KEY);
  const [integrationName, setIntegrationName] = useState('');
  const [integrationKey, setIntegrationKey] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedTemplate = useMemo(() => {
    return templates.find((item) => item.id === selectedTemplateId) || templates[0];
  }, [selectedTemplateId]);

  const integrationOptions = useMemo(() => {
    const existing = (team?.integrations || []).map((integration) => ({
      key: integration.key,
      label: integration.key,
    }));

    return [{ key: NEW_KEY, label: 'Create New Integration' }, ...existing];
  }, [team]);

  useEffect(() => {
    if (selectedIntegrationKey !== NEW_KEY) {
      return;
    }
    if (!integrationKey) {
      setIntegrationKey(selectedTemplate.defaultKey);
    }
  }, [selectedIntegrationKey, selectedTemplate.defaultKey, integrationKey]);

  const resetCustomFields = () => {
    setCustomFields([]);
  };

  const resetValuesForTemplate = (template: Template, attrs?: Record<string, unknown>) => {
    const next: Record<string, string> = {};
    template.fields.forEach((field) => {
      next[field.key] = toInputValue(attrs?.[field.key]);
    });
    setFieldValues(next);
  };

  const loadIntegration = async (key: string) => {
    if (!token || !key || key === NEW_KEY) {
      return;
    }

    setIsLoading(true);
    try {
      const payload = await client.getIntegration(key);
      const attrs = payload?.attributes || {};
      const matchedTemplate =
        templates.find((template) => template.id === attrs.templateId?.toString()) || templates[0];
      setSelectedTemplateId(matchedTemplate.id);
      setIntegrationName(attrs.label?.toString() || key);
      setIntegrationKey(key);
      setEnabled(parseBool(attrs.enabled, true));
      resetValuesForTemplate(matchedTemplate, attrs);

      const knownKeys = new Set(['templateId', 'label', 'enabled', ...matchedTemplate.fields.map((field) => field.key)]);
      const unknown: CustomField[] = Object.entries(attrs)
        .filter(([attrKey]) => !knownKeys.has(attrKey))
        .map(([attrKey, value], index) => ({
          id: Date.now() + index,
          key: attrKey,
          value: toInputValue(value),
        }));
      setCustomFields(unknown);
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIntegrationKey === NEW_KEY) {
      setIntegrationName('');
      setEnabled(true);
      resetValuesForTemplate(selectedTemplate);
      resetCustomFields();
      return;
    }
    loadIntegration(selectedIntegrationKey);
  }, [selectedIntegrationKey]);

  useEffect(() => {
    if (selectedIntegrationKey !== NEW_KEY) {
      return;
    }
    resetValuesForTemplate(selectedTemplate);
  }, [selectedTemplateId]);

  const updateFieldValue = (field: string, value: string) => {
    setFieldValues((previous) => ({ ...previous, [field]: value }));
  };

  const updateCustomField = (id: number, patch: Partial<CustomField>) => {
    setCustomFields((previous) => previous.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const removeCustomField = (id: number) => {
    setCustomFields((previous) => previous.filter((field) => field.id !== id));
  };

  const addCustomField = () => {
    setCustomFields((previous) => [...previous, { id: Date.now(), key: '', value: '' }]);
  };

  const save = async () => {
    if (!team) return;

    const key = selectedIntegrationKey === NEW_KEY ? integrationKey.trim() : selectedIntegrationKey;
    if (!key) {
      store.dispatch(showModalError('Integration key is required.'));
      return;
    }

    const attributes: Record<string, string | number | boolean | null> = {
      templateId: selectedTemplate.id,
      label: integrationName.trim() || key,
      enabled,
    };

    selectedTemplate.fields.forEach((field) => {
      const value = (fieldValues[field.key] || '').trim();
      if (!value) {
        return;
      }
      if (field.type === 'number') {
        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          attributes[field.key] = parsed;
        }
        return;
      }
      attributes[field.key] = value;
    });

    customFields.forEach((field) => {
      const key = field.key.trim();
      if (!key) return;
      attributes[key] = field.value.trim();
    });

    try {
      const payload = await client.updateIntegration(team._id, {
        key,
        attributes,
      });

      store.dispatch({
        type: ActionType.TEAM_UPDATE,
        payload: { ...team, integrations: payload.integrations },
      });
      setSelectedIntegrationKey(key);
      store.dispatch(showModalSuccess(Translations.SetupChangedConfirmation[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const suggestedKey = slugifyKey(integrationName || selectedTemplate.defaultKey);

  return (
    <div className="content-box">
      <div className="schema-editor-header">
        <div className="title">
          <h2>API Integrations</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px', maxWidth: '720px' }}>
        <div style={{ color: '#556074' }}>
          Configure any external API with guided templates and plain language fields. Secrets are
          preserved unless you overwrite them.
        </div>

        <Picker
          width={320}
          selectedKey={selectedIntegrationKey}
          onSelectionChange={(key) => setSelectedIntegrationKey(key.toString())}
          items={integrationOptions}
          isDisabled={isLoading}
        >
          {(item) => <Item key={item.key}>{item.label}</Item>}
        </Picker>

        <Picker
          width={320}
          selectedKey={selectedTemplateId}
          onSelectionChange={(key) => setSelectedTemplateId(key.toString())}
          items={templates}
          isDisabled={selectedIntegrationKey !== NEW_KEY || isLoading}
        >
          {(item) => <Item key={item.id}>{item.name}</Item>}
        </Picker>

        <div style={{ color: '#556074' }}>{selectedTemplate.description}</div>

        <TextField
          label="Integration Name"
          value={integrationName}
          onChange={setIntegrationName}
          width="100%"
          isDisabled={isLoading}
        />

        <TextField
          label="Integration Key"
          value={integrationKey}
          onChange={setIntegrationKey}
          width="100%"
          isDisabled={selectedIntegrationKey !== NEW_KEY || isLoading}
        />

        {selectedIntegrationKey === NEW_KEY && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#556074' }}>
            Suggested key: <code>{suggestedKey}</code>
            <Button variant="secondary" onPress={() => setIntegrationKey(suggestedKey)}>
              Use Suggested Key
            </Button>
          </div>
        )}

        <Switch isSelected={enabled} onChange={setEnabled} isDisabled={isLoading}>
          Integration Enabled
        </Switch>

        {selectedTemplate.fields.map((field) => {
          if (field.isMultiline) {
            return (
              <TextArea
                key={field.key}
                label={field.label}
                value={fieldValues[field.key] || ''}
                onChange={(value) => updateFieldValue(field.key, value)}
                width="100%"
                placeholder={field.placeholder}
                isDisabled={isLoading}
              />
            );
          }
          return (
            <TextField
              key={field.key}
              label={field.label}
              value={fieldValues[field.key] || ''}
              onChange={(value) => updateFieldValue(field.key, value)}
              width="100%"
              placeholder={field.placeholder}
              type={field.type === 'password' ? 'password' : undefined}
              isDisabled={isLoading}
            />
          );
        })}

        <div>
          <div style={{ marginBottom: '6px', color: '#556074' }}>Custom Fields (optional)</div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {customFields.map((field) => (
              <div key={field.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <TextField
                  label="Key"
                  value={field.key}
                  onChange={(value) => updateCustomField(field.id, { key: value })}
                  width="40%"
                  isDisabled={isLoading}
                />
                <TextField
                  label="Value"
                  value={field.value}
                  onChange={(value) => updateCustomField(field.id, { value })}
                  width="50%"
                  isDisabled={isLoading}
                />
                <Button variant="secondary" onPress={() => removeCustomField(field.id)} isDisabled={isLoading}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px' }}>
            <Button variant="secondary" onPress={addCustomField} isDisabled={isLoading}>
              Add Custom Field
            </Button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
        <Button variant="primary" onPress={save} isDisabled={isLoading}>
          {Translations.SaveButton[DEFAULT_LANGUAGE]}
        </Button>
      </div>
    </div>
  );
};
