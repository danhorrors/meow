import { Button, TextField } from '@adobe/react-spectrum';
import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Customer, CustomerPreview } from '../../interfaces/Customer';
import { selectCustomer, selectSchemaByType } from '../../store/Store';
import { ApplicationStore } from '../../store/ApplicationStore';
import { SchemaType } from '../../interfaces/Schema';
import { SchemaCanvas } from '../schema/SchemaCanvas';
import { Attribute } from '../../interfaces/Attribute';
import { Translations } from '../../Translations';
import { DEFAULT_LANGUAGE } from '../../Constants';

export interface FormProps {
  id: Customer['_id'] | undefined;
  update: (id: Customer['_id'] | undefined, customer: CustomerPreview) => void;
}

export const Form = ({ update, id }: FormProps) => {
  const [preview, setPreview] = useState<CustomerPreview>({
    name: '',
    attributes: undefined,
    contact: {},
  });

  const schema = useSelector((store: ApplicationStore) =>
    selectSchemaByType(store, SchemaType.Customer)
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

  const customer = useSelector((store: ApplicationStore) => selectCustomer(store, id));

  useEffect(() => {
    if (customer) {
      setPreview({
        ...customer,
      });
    } else {
      setPreview({
        name: '',
        attributes: undefined,
        contact: {},
      });
    }
  }, [customer]);

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
      <div style={{ marginTop: '10px' }}>
        <TextField
          onChange={(value) =>
            setPreview({
              ...preview,
              contact: { ...preview.contact, email: value },
            })
          }
          value={preview.contact?.email || ''}
          aria-label={Translations.EmailLabel[DEFAULT_LANGUAGE]}
          width="100%"
          key="email"
          label={Translations.EmailLabel[DEFAULT_LANGUAGE]}
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <TextField
          onChange={(value) =>
            setPreview({
              ...preview,
              contact: { ...preview.contact, phone: value },
            })
          }
          value={preview.contact?.phone || ''}
          aria-label={Translations.PhoneLabel[DEFAULT_LANGUAGE]}
          width="100%"
          key="phone"
          label={Translations.PhoneLabel[DEFAULT_LANGUAGE]}
        />
      </div>

      {schema && (
        <SchemaCanvas
          values={customer?.attributes}
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
