import React, { useState, useRef, useEffect } from 'react';
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
  const [isSelected, setIsSelected] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const rowRef = useRef<HTMLDivElement>(null);

  // Dismiss action bar when clicking outside this message row
  useEffect(() => {
    if (!isSelected) return;
    const handleOutside = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsSelected(false); };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isSelected]);

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

  // Border-radius creates the "tail" effect on the first bubble in a group.
  // Tail corner = top-right for mine, top-left for theirs.
  const bubbleRadius = isMine
    ? isGrouped ? '18px' : '18px 4px 18px 18px'
    : isGrouped ? '18px' : '4px 18px 18px 18px';

  return (
    <div
      ref={rowRef}
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
        padding: isGrouped ? '1px 16px' : '8px 16px 2px',
        position: 'relative',
        opacity: isSending ? 0.65 : 1,
      }}
    >
      {/* Avatar slot — theirs only, only on first of a group */}
      <div style={{ width: 36, flexShrink: 0, alignSelf: 'flex-end' }}>
        {!isMine && !isGrouped && (
          <UserAvatar user={message.sender} size="md" showPresence={false} />
        )}
      </div>

      {/* Content column — max 70% width keeps bubbles readable */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMine ? 'flex-end' : 'flex-start',
          maxWidth: '70%',
          minWidth: 0,
          gap: 2,
        }}
      >
        {/* Sender name + timestamp — theirs only, first of group */}
        {!isGrouped && !isMine && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 4 }}>
            <span
              style={{
                fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
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

        {/* Reply-to preview — rendered ABOVE the bubble as a separate floating quote */}
        {message.replyTo && (
          <div
            style={{
              position: 'relative',
              padding: '5px 10px 10px',
              marginBottom: -6,
              borderRadius: isMine ? '14px 14px 0 0' : '14px 14px 0 0',
              background: isMine
                ? 'rgba(0,0,0,0.22)'
                : 'var(--color-surface-2)',
              opacity: 0.75,
              maxWidth: '100%',
              overflow: 'hidden',
              borderLeft: isMine ? 'none' : '2px solid rgba(47,129,247,0.5)',
              borderRight: isMine ? '2px solid rgba(255,255,255,0.3)' : 'none',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)',
                marginBottom: 2,
              }}
            >
              {message.replyTo.sender.displayName}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                color: isMine ? 'rgba(255,255,255,0.45)' : 'var(--color-text-muted)',
                opacity: 0.8,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontStyle: 'italic',
              }}
            >
              {message.replyTo.content.slice(0, 90)}
              {message.replyTo.content.length > 90 && '…'}
            </span>
          </div>
        )}

        {/* Bubble — inline edit or rendered text */}
        {isEditing ? (
          <div style={{ width: '100%' }}>
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
                borderRadius: '8px',
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
          <div
            onClick={() => !isEditing && setIsSelected((s) => !s)}
            style={{
              padding: '8px 12px',
              borderRadius: message.replyTo
                ? isMine ? '4px 18px 18px 18px' : '18px 4px 18px 18px'
                : bubbleRadius,
              background: isMine ? 'var(--color-brand-primary)' : 'var(--color-surface-3)',
              color: isMine ? '#fff' : 'var(--color-text-primary)',
              border: isFailed ? `1px solid var(--color-danger)` : '1px solid transparent',
              fontSize: 'var(--font-size-base)',
              lineHeight: 'var(--line-height-base)',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              cursor: 'pointer',
              userSelect: 'text',
              outline: isSelected ? `2px solid ${isMine ? 'rgba(255,255,255,0.4)' : 'var(--color-brand-primary)'}` : 'none',
              outlineOffset: 2,
              transition: 'outline var(--transition-fast)',
            }}
          >
            {message.content}
          </div>
        )}

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
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
                    maxWidth: 280,
                    maxHeight: 200,
                    width: 'auto',
                    height: 'auto',
                    borderRadius: '12px',
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
                    background: isMine ? 'rgba(255,255,255,0.15)' : 'var(--color-surface-2)',
                    borderRadius: '10px',
                    color: isMine ? '#fff' : 'var(--color-text-link)',
                    fontSize: 'var(--font-size-sm)',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  📎 {att.filename}
                  <span style={{ color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)' }}>
                    {formatFileSize(att.size)}
                  </span>
                </a>
              )
            )}
          </div>
        )}

        {/* Reactions — rendered directly below the bubble with negative margin to overlap the edge */}
        {message.reactions.length > 0 && (
          <div style={{ marginTop: -10, zIndex: 1, alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
            <ReactionBar
              reactions={message.reactions}
              onToggle={(emoji) => toggleReaction({ messageId: message.id, emoji })}
            />
          </div>
        )}

        {/* Timestamp (mine only — theirs is in the header row) */}
        {isMine && !isGrouped && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', paddingRight: 2 }}>
            {formatTime(message.createdAt)}
            {message.editedAt && ' (edited)'}
          </span>
        )}

        {/* Failed-to-send notice */}
        {isMine && isFailed && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>
            Failed to send ·{' '}
            <button style={{ background: 'none', border: 'none', color: 'var(--color-text-link)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>
              Retry
            </button>
          </div>
        )}

        {/* Hover action bar — inline below the bubble, same alignment side */}
        {isSelected && !isEditing && (
          <div style={{ marginTop: 2 }}>
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
    </div>
  );
});
