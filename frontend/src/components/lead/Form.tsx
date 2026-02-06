import { Button, TextField } from '@adobe/react-spectrum';
import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Lead, LeadPreview } from '../../interfaces/Lead';
import { selectLead, selectSchemaByType } from '../../store/Store';
import { ApplicationStore } from '../../store/ApplicationStore';
import { SchemaType } from '../../interfaces/Schema';
import { SchemaCanvas } from '../schema/SchemaCanvas';
import { Attribute } from '../../interfaces/Attribute';
import { Translations } from '../../Translations';
import { DEFAULT_LANGUAGE } from '../../Constants';

export interface FormProps {
  id: Lead['_id'] | undefined;
  update: (id: Lead['_id'] | undefined, lead: LeadPreview) => void;
}

export const Form = ({ update, id }: FormProps) => {
  const [preview, setPreview] = useState<LeadPreview>({
    name: '',
    attributes: undefined,
  });

  const schema = useSelector((store: ApplicationStore) =>
    selectSchemaByType(store, SchemaType.Lead)
  );

  const handlePreviewUpdate = (key: string, value: Attribute[typeof key]) => {
    setPreview({
      ...preview,
      [key]: value,
    });
  };

  const isValidForm = useMemo(() => {
    return Boolean(preview.name);
  }, [preview]);

  const lead = useSelector((store: ApplicationStore) => selectLead(store, id));

  useEffect(() => {
    if (lead) {
      setPreview({
        ...lead,
      });
    } else {
      setPreview({
        name: '',
        attributes: undefined,
      });
    }
  }, [lead]);

  const validate = (values: Attribute) => {
    setPreview({
      ...preview,
      attributes: {
        ...values,
      },
    });
  };

  const save = () => {
    update(id, { ...preview });
  };

  return (
    <div style={{ padding: '15px' }}>
      <div style={{ marginTop: '10px' }}>
        <TextField
          onChange={(value) => handlePreviewUpdate('name', value)}
          value={preview.name}
          aria-label={Translations.NameLabel[DEFAULT_LANGUAGE]}
          width="100%"
          key="name"
          label={Translations.NameLabel[DEFAULT_LANGUAGE]}
        />
      </div>

      {schema && (
        <SchemaCanvas
          values={lead?.attributes}
          schema={schema}
          validate={validate}
          isDisabled={false}
        />
      )}

      <div style={{ marginTop: '24px' }}>
        <Button variant="primary" onPress={save} isDisabled={!isValidForm}>
          {Translations.SaveButton[DEFAULT_LANGUAGE]}
        </Button>
      </div>
    </div>
  );
};
