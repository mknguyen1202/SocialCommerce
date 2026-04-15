import React from 'react';
import type { Conversation, DomainUser } from '../../../shared/types/domain';
import { UserAvatar } from '../shared/UserAvatar';
import { Badge } from '../../../shared/components/Badge';

interface ConversationListItemProps {
  conversation: Conversation;
  currentUser: DomainUser | null;
  isActive: boolean;
  onClick: () => void;
}

function getConversationDisplayName(
  conv: Conversation,
  currentUserId: string | undefined
): string {
  if (conv.name) return conv.name;
  const other = conv.participants.find((p) => p.id !== currentUserId);
  return other?.displayName ?? 'Unknown';
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export const ConversationListItem: React.FC<ConversationListItemProps> = React.memo(({
  conversation,
  currentUser,
  isActive,
  onClick,
}) => {
  const displayName = getConversationDisplayName(conversation, currentUser?.id);
  const otherUser =
    conversation.type === 'dm'
      ? conversation.participants.find((p) => p.id !== currentUser?.id) ?? null
      : null;

  const lastMsgText = conversation.lastMessage
    ? truncate(conversation.lastMessage.content, 40)
    : 'No messages yet';

  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        background: isActive ? 'var(--color-surface-3)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {otherUser ? (
        <UserAvatar user={otherUser} size="md" showPresence />
      ) : (
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          #
        </span>
      )}

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: conversation.unreadCount > 0
                ? 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight']
                : 'var(--font-weight-normal)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </span>
          {conversation.unreadCount > 0 && (
            <Badge count={conversation.unreadCount} />
          )}
        </div>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            margin: 0,
          }}
        >
          {lastMsgText}
        </p>
      </div>
    </button>
  );
});
