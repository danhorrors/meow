import React from 'react';
import { copyToClipboard } from '../utils/copyToClipboard';
import { useToast } from './useToast';

type InviteLinkButtonProps = {
  inviteLink: string;
  className?: string;
  ariaLabel?: string;
  onCopySuccess?: (message?: string) => void;
  onCopyError?: (error?: Error) => void;
};

export const InviteLinkButton: React.FC<InviteLinkButtonProps> = ({
  inviteLink,
  className,
  ariaLabel = 'Copy invite link',
  onCopySuccess,
  onCopyError,
}) => {
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await copyToClipboard(inviteLink);
      const successMessage = 'Invite link copied to clipboard';
      if (onCopySuccess) onCopySuccess(successMessage);
      else showToast(successMessage, { type: 'success' });
    } catch (err) {
      const errorMessage =
        'Could not copy automatically. The invite link has been selected for manual copy.';
      if (onCopyError) onCopyError(err as Error);
      else showToast(errorMessage, { type: 'error' });
    }
  };

  return (
    <button type="button" onClick={handleCopy} className={className} aria-label={ariaLabel}>
      Copy Invite Link
    </button>
  );
};

export default InviteLinkButton;
