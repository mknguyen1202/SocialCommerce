import React, { useState } from 'react';
import type { DomainMessage } from '../../../shared/types/domain';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface MessageActionsProps {
  message?: DomainMessage;
  isMine: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  isMine,
  onEdit,
  onDelete,
  onReact,
  onReply,
}) => {
  const [showEmojis, setShowEmojis] = useState(false);

  return (
    <div
      role="toolbar"
      aria-label="Message actions"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-surface-3)',
        borderRadius: 'var(--radius-md)',
        padding: '2px 4px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Quick emoji reactions */}
      <div style={{ position: 'relative' }}>
        <ActionBtn label="Add reaction" onClick={() => setShowEmojis((s) => !s)}>
          😊
        </ActionBtn>
        {showEmojis && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: 0,
              display: 'flex',
              gap: 4,
              background: 'var(--color-surface-0)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 8px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 'var(--z-dropdown)' as unknown as number,
            }}
          >
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                aria-label={e}
                onClick={() => { onReact(e); setShowEmojis(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 2 }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <ActionBtn label="Reply" onClick={onReply}>↩</ActionBtn>

      {isMine && (
        <>
          <ActionBtn label="Edit" onClick={onEdit}>✏️</ActionBtn>
          <ActionBtn label="Delete" onClick={onDelete} danger>🗑️</ActionBtn>
        </>
      )}
    </div>
  );
};

const ActionBtn: React.FC<{
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, danger, children }) => (
  <button
    aria-label={label}
    onClick={onClick}
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      borderRadius: 'var(--radius-sm)',
      padding: '3px 6px',
      fontSize: 14,
      color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)',
      transition: 'background var(--transition-fast)',
    }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)')}
    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
  >
    {children}
  </button>
);
