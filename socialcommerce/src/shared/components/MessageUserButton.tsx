import React from 'react';
import { Button } from './Button';
import { useCrossDomainNav } from '../hooks/useCrossDomainNav';

export interface MessageUserButtonProps {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MessageUserButton: React.FC<MessageUserButtonProps> = ({
  userId,
  displayName,
  avatarUrl,
  size = 'sm',
}) => {
  const { openDM } = useCrossDomainNav();

  return (
    <Button
      variant="secondary"
      size={size}
      leftIcon="💬"
      onClick={() => openDM(userId, displayName, avatarUrl)}
    >
      Message
    </Button>
  );
};
