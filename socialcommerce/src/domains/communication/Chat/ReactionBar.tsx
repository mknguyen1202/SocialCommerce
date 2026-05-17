import React, { useState } from 'react';
import type { DomainReaction } from '../../../shared/types/domain';
import { useAuthContext } from '../../../app/providers/AuthProvider';

interface ReactionBarProps {
  reactions: DomainReaction[];
  onToggle: (emoji: string) => void;
}

// CSS keyframes injected once via a <style> tag
const KEYFRAMES = `
@keyframes reaction-pop {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(1); }
}
.reaction-chip { animation: reaction-pop 220ms cubic-bezier(.34,1.56,.64,1) both; }
.reaction-chip:hover { filter: brightness(1.15); }
`;

let injected = false;
function ensureStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const el = document.createElement('style');
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
}

export const ReactionBar: React.FC<ReactionBarProps> = React.memo(({ reactions, onToggle }) => {
  const { user } = useAuthContext();
  const [tooltip, setTooltip] = useState<string | null>(null);
  ensureStyles();

  if (reactions.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        padding: '4px 2px 2px',
      }}
    >
      {reactions.map((r) => {
        const reactedByMe = user ? r.userIds.includes(user.id) : false;
        const isShowing = tooltip === r.emoji;

        return (
          <div key={r.emoji} style={{ position: 'relative' }}>
            <button
              className="reaction-chip"
              aria-label={`React with ${r.emoji}, ${r.count} reaction${r.count !== 1 ? 's' : ''}`}
              aria-pressed={reactedByMe}
              onClick={() => onToggle(r.emoji)}
              onMouseEnter={() => setTooltip(r.emoji)}
              onMouseLeave={() => setTooltip(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                borderRadius: 'var(--radius-full)',
                background: reactedByMe
                  ? 'color-mix(in srgb, var(--color-brand-primary) 20%, transparent)'
                  : 'var(--color-surface-3)',
                border: reactedByMe
                  ? '1px solid var(--color-brand-primary)'
                  : '1px solid var(--color-border-muted)',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                color: reactedByMe ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
                fontWeight: reactedByMe ? 'var(--font-weight-semibold)' : 'normal',
                boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                transition: 'background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
              }}
            >
              <span style={{ fontSize: 15 }}>{r.emoji}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', minWidth: 8 }}>{r.count}</span>
            </button>

            {/* Tooltip showing reactor count / "You reacted" */}
            {isShowing && (
              <div
                role="tooltip"
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  background: 'var(--color-surface-0)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-xs)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-default)',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              >
                {r.emoji}{' '}
                {reactedByMe
                  ? r.count === 1
                    ? 'You reacted'
                    : `You + ${r.count - 1} other${r.count - 1 !== 1 ? 's' : ''}`
                  : `${r.count} reaction${r.count !== 1 ? 's' : ''}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
