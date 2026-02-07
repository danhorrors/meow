import { Button, Item, Picker, TextField } from '@adobe/react-spectrum';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { SchemaAttributeType, SchemaType } from '../../interfaces/Schema';
import { selectSchemas } from '../../store/Store';
import { CampaignCondition } from '../../interfaces/Campaign';
import { Translations } from '../../Translations';
import { DEFAULT_LANGUAGE } from '../../Constants';
import { SchemaHelper } from '../../helpers/SchemaHelper';

export type SegmentEntity = 'leads' | 'customers' | 'accounts' | 'opportunities' | 'users';

type FieldType = 'text' | 'email' | 'select' | 'boolean' | 'reference' | 'number' | 'date';

type FieldOption = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
};

export interface SegmentBuilderProps {
  entity: SegmentEntity;
  match: 'all' | 'any';
  conditions: CampaignCondition[];
  onChange: (next: { match: 'all' | 'any'; conditions: CampaignCondition[] }) => void;
}

const schemaTypeForEntity: Record<SegmentEntity, SchemaType | null> = {
  leads: SchemaType.Lead,
  customers: SchemaType.Customer,
  accounts: SchemaType.Account,
  opportunities: SchemaType.Card,
  users: null,
};

const baseFields: Record<SegmentEntity, FieldOption[]> = {
  leads: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'contact.email', label: 'Email', type: 'email' },
    { key: 'contact.phone', label: 'Phone', type: 'text' },
    { key: 'contact.domain', label: 'Domain', type: 'text' },
    { key: 'createdAt', label: 'Created At', type: 'date' },
    { key: 'updatedAt', label: 'Updated At', type: 'date' },
  ],
  customers: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'contact.email', label: 'Email', type: 'email' },
    { key: 'contact.phone', label: 'Phone', type: 'text' },
    { key: 'contact.domain', label: 'Domain', type: 'text' },
    { key: 'createdAt', label: 'Created At', type: 'date' },
    { key: 'updatedAt', label: 'Updated At', type: 'date' },
  ],
  accounts: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'createdAt', label: 'Created At', type: 'date' },
    { key: 'updatedAt', label: 'Updated At', type: 'date' },
  ],
  opportunities: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'laneId', label: 'Lane', type: 'reference' },
    { key: 'closedAt', label: 'Closed At', type: 'date' },
    { key: 'nextFollowUpAt', label: 'Next Follow Up', type: 'date' },
    { key: 'createdAt', label: 'Created At', type: 'date' },
    { key: 'updatedAt', label: 'Updated At', type: 'date' },
  ],
  users: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'status', label: 'Status', type: 'text' },
    { key: 'createdAt', label: 'Created At', type: 'date' },
    { key: 'updatedAt', label: 'Updated At', type: 'date' },
  ],
};

const operatorsByType: Record<FieldType, string[]> = {
  text: ['equals', 'not_equals', 'contains', 'not_contains', 'exists', 'not_exists'],
  email: ['equals', 'not_equals', 'contains', 'not_contains', 'exists', 'not_exists'],
  select: ['equals', 'not_equals', 'exists', 'not_exists'],
  boolean: ['equals', 'not_equals', 'exists', 'not_exists'],
  reference: ['equals', 'not_equals', 'exists', 'not_exists'],
  number: ['equals', 'not_equals', 'contains', 'not_contains', 'exists', 'not_exists'],
  date: ['equals', 'not_equals', 'contains', 'not_contains', 'exists', 'not_exists'],
};

const operatorLabels: Record<string, string> = {
  equals: 'equals',
  not_equals: 'not equals',
  contains: 'contains',
  not_contains: 'not contains',
  exists: 'exists',
  not_exists: 'not exists',
};

const buildAttributeField = (attr: any): FieldOption => {
  if (SchemaHelper.isSelectAttribute(attr)) {
    return {
      key: `attributes.${attr.key}`,
      label: attr.name,
      type: 'select',
      options: attr.options || [],
    };
  }
  if (SchemaHelper.isReferenceAttribute(attr)) {
    return {
      key: `attributes.${attr.key}`,
      label: attr.name,
      type: 'reference',
    };
  }
  switch (attr.type) {
    case SchemaAttributeType.Boolean:
      return { key: `attributes.${attr.key}`, label: attr.name, type: 'boolean' };
    case SchemaAttributeType.Email:
      return { key: `attributes.${attr.key}`, label: attr.name, type: 'email' };
    case SchemaAttributeType.TextArea:
    case SchemaAttributeType.Text:
    default:
      return { key: `attributes.${attr.key}`, label: attr.name, type: 'text' };
  }
};

export const SegmentBuilder = ({ entity, match, conditions, onChange }: SegmentBuilderProps) => {
  const schemas = useSelector(selectSchemas);

  const fields = useMemo(() => {
    const schemaType = schemaTypeForEntity[entity];
    const schema = schemaType ? schemas.find((item) => item.type === schemaType) : undefined;
    const schemaFields = (schema?.attributes || []).map(buildAttributeField);
    return [...(baseFields[entity] || []), ...schemaFields];
  }, [entity, schemas]);

  const addCondition = () => {
    const firstField = fields[0];
    const operator = firstField ? operatorsByType[firstField.type][0] : 'equals';
    const next: CampaignCondition = {
      field: firstField?.key || '',
      operator,
      value: '',
    };
    onChange({ match, conditions: [...conditions, next] });
  };

  const updateCondition = (index: number, patch: Partial<CampaignCondition>) => {
    const next = conditions.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    onChange({ match, conditions: next });
  };

  const removeCondition = (index: number) => {
    const next = conditions.filter((_, idx) => idx !== index);
    onChange({ match, conditions: next });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Picker
          width={220}
          selectedKey={match}
          onSelectionChange={(key) => onChange({ match: key.toString() as any, conditions })}
        >
          <Item key="all">{Translations.CampaignMatchAllLabel[DEFAULT_LANGUAGE]}</Item>
          <Item key="any">{Translations.CampaignMatchAnyLabel[DEFAULT_LANGUAGE]}</Item>
        </Picker>
      </div>

      <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
        {conditions.map((condition, index) => {
          const field = fields.find((item) => item.key === condition.field) || fields[0];
          const operators = field ? operatorsByType[field.type] : operatorsByType.text;
          const showValue = condition.operator !== 'exists' && condition.operator !== 'not_exists';
          const valueOptions =
            field?.type === 'boolean'
              ? ['true', 'false']
              : field?.type === 'select'
              ? field?.options || []
              : [];

          return (
            <div key={`${condition.field}-${index}`} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Picker
                width={220}
                selectedKey={field?.key || ''}
                onSelectionChange={(key) => updateCondition(index, { field: key.toString() })}
              >
                {fields.map((item) => (
                  <Item key={item.key}>{item.label}</Item>
                ))}
              </Picker>
              <Picker
                width={180}
                selectedKey={condition.operator}
                onSelectionChange={(key) => updateCondition(index, { operator: key.toString() as any })}
              >
                {operators.map((op) => (
                  <Item key={op}>{operatorLabels[op] || op}</Item>
                ))}
              </Picker>
              {showValue &&
                (valueOptions.length > 0 ? (
                  <Picker
                    width={220}
                    selectedKey={condition.value || ''}
                    onSelectionChange={(key) => updateCondition(index, { value: key.toString() })}
                  >
                    {valueOptions.map((option) => (
                      <Item key={option}>{option}</Item>
                    ))}
                  </Picker>
                ) : (
                  <TextField
                    label={Translations.CampaignConditionValueLabel[DEFAULT_LANGUAGE]}
                    value={condition.value || ''}
                    onChange={(value) => updateCondition(index, { value })}
                  />
                ))}
              <Button variant="secondary" onPress={() => removeCondition(index)}>
                {Translations.DeleteButton[DEFAULT_LANGUAGE]}
              </Button>
            </div>
          );
        })}
        <Button variant="secondary" onPress={addCondition}>
          {Translations.AddButton[DEFAULT_LANGUAGE]}
        </Button>
      </div>
    </div>
  );
};
