import { Button } from '@adobe/react-spectrum';
import React from 'react';
import { copyToClipboard } from '../../utils/copyToClipboard';
import { Translations } from '../../Translations';
import { DEFAULT_LANGUAGE } from '../../Constants';

type Props = {
  inviteToken?: string | null;
  createInviteUrl: (inviteToken?: string | null) => string;
  className?: string;
};

export const InviteLinkButton: React.FC<Props> = ({ inviteToken, createInviteUrl, className }) => {
  const handleCopy = async () => {
    try {
      const url = createInviteUrl(inviteToken);
      await copyToClipboard(url);
      // Minimal feedback fallback: replace with app's toast system if available
      // eslint-disable-next-line no-alert
      alert(Translations.CopyInviteButton?.[DEFAULT_LANGUAGE] ? 'Invite link copied' : 'Invite link copied');
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Could not copy invite link automatically. Please copy it manually.');
    }
  };

  return (
    <Button variant="primary" onPress={handleCopy} className={className}>
      {Translations.CopyInviteButton[DEFAULT_LANGUAGE]}
    </Button>
  );
};

export default InviteLinkButton;
