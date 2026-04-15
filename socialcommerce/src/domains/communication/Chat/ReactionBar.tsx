import React from 'react';
import type { DomainReaction } from '../../../shared/types/domain';
import { useAuthContext } from '../../../app/providers/AuthProvider';

interface ReactionBarProps {
  reactions: DomainReaction[];
  onToggle: (emoji: string) => void;
}

export const ReactionBar: React.FC<ReactionBarProps> = React.memo(({ reactions, onToggle }) => {
  const { user } = useAuthContext();

  if (reactions.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
      }}
    >
      {reactions.map((r) => {
        const reactedByMe = user ? r.userIds.includes(user.id) : false;
        return (
          <button
            key={r.emoji}
            aria-label={`${r.emoji} ${r.count}`}
            aria-pressed={reactedByMe}
            onClick={() => onToggle(r.emoji)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              background: reactedByMe
                ? 'rgba(88,101,242,0.3)'
                : 'var(--color-surface-3)',
              border: reactedByMe
                ? '1px solid var(--color-brand-primary)'
                : '1px solid transparent',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-primary)',
              transition: 'background var(--transition-fast)',
            }}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        );
      })}
    </div>
  );
});
