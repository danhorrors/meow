import { Button, Picker, Item, TextArea, TextField } from '@adobe/react-spectrum';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { showModalError, showModalSuccess } from '../../actions/Actions';
import { DEFAULT_LANGUAGE } from '../../Constants';
import { getRequestClient } from '../../helpers/RequestHelper';
import { hasPermission } from '../../helpers/PermissionHelper';
import { selectRoles, selectSessionUser, selectToken, store } from '../../store/Store';
import { Translations } from '../../Translations';

export interface EmailComposerProps {
  entityType?: string;
  entityId?: string;
  defaultTo?: string;
}

export const EmailComposer = ({ entityType, entityId, defaultTo }: EmailComposerProps) => {
  const token = useSelector(selectToken);
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);
  const client = getRequestClient(token);

  const [to, setTo] = useState(defaultTo || '');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [provider, setProvider] = useState<'gmail' | 'mailgun'>('gmail');

  const canSend = useMemo(
    () => hasPermission(sessionUser, roles, 'emails', 'add'),
    [sessionUser, roles]
  );

  const send = async () => {
    const recipients = to
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (recipients.length === 0 || !subject) {
      store.dispatch(showModalError('Missing recipients or subject.'));
      return;
    }

    try {
      await client.sendEmail({
        to: recipients,
        subject,
        html: html || undefined,
        text: text || undefined,
        provider,
        entityType,
        entityId,
      });

      store.dispatch(showModalSuccess(Translations.EmailSentConfirmation[DEFAULT_LANGUAGE]));
      setSubject('');
      setHtml('');
      setText('');
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  if (!canSend) {
    return <div>{Translations.PermissionDeniedText[DEFAULT_LANGUAGE]}</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <TextField
        label={Translations.EmailToLabel[DEFAULT_LANGUAGE]}
        value={to}
        onChange={setTo}
        placeholder="name@example.com"
      />
      <TextField
        label={Translations.EmailSubjectLabel[DEFAULT_LANGUAGE]}
        value={subject}
        onChange={setSubject}
      />
      <Picker
        width={220}
        selectedKey={provider}
        onSelectionChange={(key) => setProvider(key.toString() as 'gmail' | 'mailgun')}
      >
        <Item key="gmail">{Translations.EmailProviderGmail[DEFAULT_LANGUAGE]}</Item>
        <Item key="mailgun">{Translations.EmailProviderMailgun[DEFAULT_LANGUAGE]}</Item>
      </Picker>
      <TextArea
        label={Translations.EmailHtmlLabel[DEFAULT_LANGUAGE]}
        value={html}
        onChange={setHtml}
        placeholder="<p>Hello {{name}}</p>"
      />
      <TextArea
        label={Translations.EmailTextLabel[DEFAULT_LANGUAGE]}
        value={text}
        onChange={setText}
        placeholder="Hello"
      />
      <Button variant="primary" onPress={send}>
        {Translations.SendEmailButton[DEFAULT_LANGUAGE]}
      </Button>
    </div>
  );
};
