import React, { useState } from 'react';
import type { DomainMessage, DomainUser } from '../../../shared/types/domain';
import { UserAvatar } from '../shared/UserAvatar';
import { ReactionBar } from './ReactionBar';
import { MessageActions } from './MessageActions';
import { useEditMessage, useDeleteMessage, useToggleReaction } from '../hooks/useMessages';

interface MessageItemProps {
  message: DomainMessage;
  currentUser: DomainUser | null;
  isGrouped: boolean; // same sender as previous msg within 5 min
  onReply: (message: DomainMessage) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MessageItem: React.FC<MessageItemProps> = React.memo(({
  message,
  currentUser,
  isGrouped,
  onReply,
}) => {
  const isMine = message.sender.id === currentUser?.id;
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const { mutate: editMessage } = useEditMessage(message.conversationId);
  const { mutate: deleteMessage } = useDeleteMessage(message.conversationId);
  const { mutate: toggleReaction } = useToggleReaction(message.conversationId);

  const handleSaveEdit = () => {
    if (editContent.trim() === message.content) { setIsEditing(false); return; }
    editMessage(
      { messageId: message.id, content: editContent.trim() },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
    if (e.key === 'Escape') { setIsEditing(false); setEditContent(message.content); }
  };

  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        gap: 12,
        padding: isGrouped ? '2px 16px' : '8px 16px 2px',
        position: 'relative',
        background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        opacity: isSending ? 0.7 : 1,
        borderLeft: isFailed ? '2px solid var(--color-danger)' : '2px solid transparent',
      }}
    >
      {/* Avatar column — only on first of a group */}
      <div style={{ width: 40, flexShrink: 0 }}>
        {!isGrouped && <UserAvatar user={message.sender} size="md" showPresence={false} />}
      </div>

      {/* Message content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        {!isGrouped && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span
              style={{
                fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-base)',
              }}
            >
              {message.sender.displayName}
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {formatTime(message.createdAt)}
              {message.editedAt && ' (edited)'}
            </span>
          </div>
        )}

        {/* Reply-to preview */}
        {message.replyTo && (
          <div
            style={{
              borderLeft: '3px solid var(--color-brand-primary)',
              paddingLeft: 8,
              marginBottom: 4,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            <strong>{message.replyTo.sender.displayName}</strong>
            {' · '}
            {message.replyTo.content.slice(0, 60)}
            {message.replyTo.content.length > 60 && '…'}
          </div>
        )}

        {/* Inline edit */}
        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              rows={2}
              style={{
                width: '100%',
                background: 'var(--color-surface-0)',
                border: '1px solid var(--color-brand-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-base)',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Enter to save · Esc to cancel
            </p>
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              color: isFailed ? 'var(--color-danger)' : 'var(--color-text-primary)',
              fontSize: 'var(--font-size-base)',
              lineHeight: 'var(--line-height-base)',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.content}
          </p>
        )}

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {message.attachments.map((att) =>
              att.type === 'image' ? (
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.filename}
                  loading="lazy"
                  decoding="async"
                  width={320}
                  height={240}
                  style={{
                    maxWidth: 320,
                    maxHeight: 240,
                    width: 'auto',
                    height: 'auto',
                    borderRadius: 'var(--radius-md)',
                    objectFit: 'cover',
                    cursor: 'pointer',
                  }}
                />
              ) : (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: 'var(--color-surface-3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-link)',
                    fontSize: 'var(--font-size-sm)',
                    textDecoration: 'none',
                  }}
                >
                  📎 {att.filename}
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {formatFileSize(att.size)}
                  </span>
                </a>
              )
            )}
          </div>
        )}

        {/* Status indicator for own messages */}
        {isMine && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {isFailed && (
              <span style={{ color: 'var(--color-danger)' }}>
                Failed to send · <button style={{ background: 'none', border: 'none', color: 'var(--color-text-link)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>Retry</button>
              </span>
            )}
          </div>
        )}

        {/* Reactions */}
        <ReactionBar
          reactions={message.reactions}
          onToggle={(emoji) => toggleReaction({ messageId: message.id, emoji })}
        />
      </div>

      {/* Hover actions — shown absolutely top-right */}
      {isHovered && !isEditing && (
        <div
          style={{
            position: 'absolute',
            top: -18,
            right: 16,
            zIndex: 10,
          }}
        >
          <MessageActions
            message={message}
            isMine={isMine}
            onEdit={() => setIsEditing(true)}
            onDelete={() => deleteMessage(message.id)}
            onReact={(emoji) => toggleReaction({ messageId: message.id, emoji })}
            onReply={() => onReply(message)}
          />
        </div>
      )}
    </div>
  );
});
