import { Button, Item, Picker, ProgressBar, TextField } from '@adobe/react-spectrum';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { PermissionDenied } from '../components/PermissionDenied';
import { parseCsv } from '../helpers/CsvHelper';
import { getRequestClient } from '../helpers/RequestHelper';
import { hasPermission } from '../helpers/PermissionHelper';
import {
  selectLanes,
  selectRoles,
  selectSchemaByType,
  selectSessionUser,
  selectToken,
  selectUsers,
} from '../store/Store';
import { SchemaType } from '../interfaces/Schema';
import { Translations } from '../Translations';
import { DEFAULT_LANGUAGE } from '../Constants';

type EntityType = 'leads' | 'accounts' | 'opportunities';

type MappingOption = {
  key: string;
  label: string;
};

export const ImportPage = () => {
  const token = useSelector(selectToken);
  const client = getRequestClient(token);
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);
  const users = useSelector(selectUsers);
  const lanes = useSelector(selectLanes);
  const accountSchema = useSelector((store) => selectSchemaByType(store as any, SchemaType.Account));
  const leadSchema = useSelector((store) => selectSchemaByType(store as any, SchemaType.Lead));
  const cardSchema = useSelector((store) => selectSchemaByType(store as any, SchemaType.Card));

  const [entity, setEntity] = useState<EntityType>('leads');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const canLeadAdd = hasPermission(sessionUser, roles, 'leads', 'add');
  const canAccountAdd = hasPermission(sessionUser, roles, 'accounts', 'add');
  const canCardAdd = hasPermission(sessionUser, roles, 'opportunities', 'add');

  const canAccess = canLeadAdd || canAccountAdd || canCardAdd;

  const schema = entity === 'leads' ? leadSchema : entity === 'accounts' ? accountSchema : cardSchema;

  const { headers, rows } = useMemo(() => parseCsv(csvText), [csvText]);

  const options = useMemo<MappingOption[]>(() => {
    const list: MappingOption[] = [{ key: '', label: Translations.IgnoreLabel[DEFAULT_LANGUAGE] }];

    list.push({ key: 'name', label: Translations.NameLabel[DEFAULT_LANGUAGE] });

    if (entity === 'opportunities') {
      list.push({ key: 'amount', label: Translations.OpportunityAmount[DEFAULT_LANGUAGE] });
      list.push({ key: 'laneName', label: Translations.StageLabel[DEFAULT_LANGUAGE] });
      list.push({ key: 'nextFollowUpAt', label: Translations.NextFollowUpLabel[DEFAULT_LANGUAGE] });
      list.push({ key: 'closedAt', label: Translations.ExpectedCloseDateLabel[DEFAULT_LANGUAGE] });
    }

    if (entity === 'leads') {
      list.push({ key: 'contact.email', label: Translations.EmailLabel[DEFAULT_LANGUAGE] });
      list.push({ key: 'contact.phone', label: Translations.PhoneLabel[DEFAULT_LANGUAGE] });
    }

    list.push({ key: 'userName', label: Translations.AssignRoleLabel[DEFAULT_LANGUAGE] });

    schema?.attributes?.forEach((attr) => {
      list.push({ key: `attr:${attr.key}`, label: attr.name });
    });

    return list;
  }, [schema, entity]);

  const updateMapping = (header: string, value: string) => {
    setMapping({ ...mapping, [header]: value });
  };

  const onFileChange = async (file: File) => {
    const text = await file.text();
    setFileName(file.name);
    setCsvText(text);
    setMapping({});
    setResult(null);
  };

  const parseDate = (value: string) => {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    return new Date(parsed).toISOString();
  };

  const importRows = async () => {
    setImporting(true);
    setProgress(0);
    setResult(null);

    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data: Record<string, string> = {};
      headers.forEach((header, idx) => {
        data[header] = row[idx] ?? '';
      });

      const payload: any = { attributes: {} };
      let name = '';

      Object.entries(mapping).forEach(([header, mapKey]) => {
        if (!mapKey) {
          return;
        }

        const value = data[header]?.trim();

        if (!value) {
          return;
        }

        if (mapKey === 'name') {
          name = value;
          payload.name = value;
          return;
        }

        if (mapKey === 'amount') {
          const parsed = parseFloat(value);
          if (!Number.isNaN(parsed)) {
            payload.amount = parsed;
          }
          return;
        }

        if (mapKey === 'laneName') {
          payload.laneName = value;
          return;
        }

        if (mapKey === 'nextFollowUpAt' || mapKey === 'closedAt') {
          const iso = parseDate(value);
          if (iso) {
            payload[mapKey] = iso;
          }
          return;
        }

        if (mapKey === 'contact.email' || mapKey === 'contact.phone') {
          payload.contact = payload.contact || {};
          const key = mapKey.split('.')[1];
          payload.contact[key] = value;
          return;
        }

        if (mapKey === 'userName') {
          const user = users.find((item) => item.name.toLowerCase() === value.toLowerCase());
          if (user) {
            payload.userId = user._id;
          }
          return;
        }

        if (mapKey.startsWith('attr:')) {
          const key = mapKey.replace('attr:', '');
          payload.attributes[key] = value;
        }
      });

      if (!payload.name) {
        skipped++;
        continue;
      }

      if (entity === 'opportunities' && !payload.amount) {
        skipped++;
        continue;
      }

      if (entity === 'opportunities' && !payload.laneName && lanes.length > 0) {
        payload.laneId = lanes[0]._id;
      }

      try {
        if (entity === 'leads') {
          await client.createLead(payload);
        } else if (entity === 'accounts') {
          await client.createAccount(payload);
        } else {
          await client.createCard(payload);
        }
        imported++;
      } catch (error) {
        skipped++;
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setResult({ imported, skipped });
    setImporting(false);
  };

  if (!canAccess) {
    return <PermissionDenied />;
  }

  return (
    <div className="canvas">
      <div className="list-view-header">
        <div>
          <h2>{Translations.ImportTitle[DEFAULT_LANGUAGE]}</h2>
        </div>
      </div>

      <div className="content-box">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Picker
            width={240}
            selectedKey={entity}
            onSelectionChange={(key) => setEntity(key.toString() as EntityType)}
          >
            {canLeadAdd && <Item key="leads">{Translations.LeadsTitle[DEFAULT_LANGUAGE]}</Item>}
            {canAccountAdd && (
              <Item key="accounts">{Translations.AccountsTitle[DEFAULT_LANGUAGE]}</Item>
            )}
            {canCardAdd && (
              <Item key="opportunities">{Translations.OpportunitiesNavItem[DEFAULT_LANGUAGE]}</Item>
            )}
          </Picker>
          <input
            type="file"
            accept=".csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onFileChange(file);
              }
            }}
          />
          {fileName && <span>{fileName}</span>}
        </div>

        {headers.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>{Translations.MappingTitle[DEFAULT_LANGUAGE]}</h3>
            {headers.map((header) => (
              <div key={header} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <TextField label={Translations.ColumnLabel[DEFAULT_LANGUAGE]} value={header} isDisabled />
                <Picker
                  width={260}
                  selectedKey={mapping[header] ?? ''}
                  onSelectionChange={(key) => updateMapping(header, key.toString())}
                  items={options}
                >
                  {(item) => <Item key={item.key}>{item.label}</Item>}
                </Picker>
              </div>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <Button variant="primary" onPress={importRows} isDisabled={importing}>
              {Translations.ImportButton[DEFAULT_LANGUAGE]}
            </Button>
          </div>
        )}

        {importing && (
          <div style={{ marginTop: '10px' }}>
            <ProgressBar value={progress} label={`${progress}%`} />
          </div>
        )}

        {result && (
          <div style={{ marginTop: '10px' }}>
            {Translations.ImportResultLabel[DEFAULT_LANGUAGE].replace('{0}', result.imported.toString()).replace('{1}', result.skipped.toString())}
          </div>
        )}
      </div>
    </div>
  );
};
