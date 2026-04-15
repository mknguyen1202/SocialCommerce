import React from 'react';
import type { TheaterChatMessage } from '../../../../shared/types/domain';
import { Avatar } from '../../../../shared/components/Avatar';

interface ChatMessageProps {
  message: TheaterChatMessage;
  isHost: boolean;
  canModerate: boolean;
  onDelete: (id: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({
  message,
  isHost,
  canModerate,
  onDelete,
}) => {
  if (message.isDeleted) {
    return (
      <div
        style={{
          padding: '2px var(--space-3)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-muted)',
          fontStyle: 'italic',
        }}
      >
        [message deleted]
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        padding: '3px var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--color-surface-3)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Avatar
        src={message.sender.avatarUrl || null}
        initials={message.sender.displayName.charAt(0).toUpperCase()}
        size="xs"
        alt={message.sender.displayName}
        style={{ marginTop: 2, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            color: isHost ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
            marginRight: 'var(--space-1)',
          }}
        >
          {message.sender.displayName}
          {isHost && (
            <span
              style={{
                marginLeft: 4,
                fontSize: 10,
                background: 'var(--color-brand-primary)',
                color: '#fff',
                borderRadius: 3,
                padding: '1px 4px',
              }}
            >
              HOST
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </span>
      </div>

      {canModerate && (
        <button
          onClick={() => onDelete(message.id)}
          aria-label="Delete message"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            fontSize: 12,
            padding: '0 2px',
            opacity: 0,
            transition: 'opacity var(--transition-fast)',
            flexShrink: 0,
          }}
          onFocus={(e) => (e.currentTarget.style.opacity = '1')}
          onBlur={(e) => (e.currentTarget.style.opacity = '0')}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
        >
          🗑
        </button>
      )}
    </div>
  );
});
