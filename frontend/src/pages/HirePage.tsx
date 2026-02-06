import { Button } from '@adobe/react-spectrum';
import { useState } from 'react';
import { Form } from '../components/hire/Form';
import { UserList } from '../components/hire/UserList';
import { useSelector } from 'react-redux';
import { selectRoles, selectSessionUser } from '../store/Store';
import { PermissionDenied } from '../components/PermissionDenied';
import { hasPermission } from '../helpers/PermissionHelper';

function createInviteUrl(invite: string) {
  return `${window.location.protocol}//${window.location.host}?invite=${invite}`;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied to clipboard');
  } catch (error) {
    console.error('Failed to copy text: ', error);
  }
}

export const HirePage = () => {
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);

  if (!hasPermission(sessionUser, roles, 'users', 'browse')) {
    return <PermissionDenied />;
  }

  return (
    <div className="canvas">
      <Form
        createInviteUrl={createInviteUrl}
        copyToClipboard={copyToClipboard}
      />

      <UserList
        createInviteUrl={createInviteUrl}
        copyToClipboard={copyToClipboard}
      />
    </div>
  );
};
