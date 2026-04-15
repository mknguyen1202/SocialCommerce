import React from 'react';
import type { TheaterParticipant } from '../../../shared/types/domain';
import { Avatar } from '../../../shared/components/Avatar';
import { Skeleton } from '../../../shared/components/Skeleton';

interface TheaterParticipantsProps {
  participants: TheaterParticipant[] | undefined;
  isLoading: boolean;
  canModerate: boolean;
  onKick: (userId: string) => void;
  onMuteChat: (userId: string, mute: boolean) => void;
}

export const TheaterParticipants: React.FC<TheaterParticipantsProps> = ({
  participants,
  isLoading,
  canModerate,
  onKick,
  onMuteChat,
}) => {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-3)' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={32} />
        ))}
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <p style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
        No participants yet
      </p>
    );
  }

  const order: Record<string, number> = { host: 0, moderator: 1, viewer: 2 };
  const sorted = [...participants].sort((a, b) => order[a.role] - order[b.role]);

  return (
    <div
      aria-label="Participants list"
      style={{ overflowY: 'auto', maxHeight: 320 }}
    >
      {sorted.map((p) => (
        <div
          key={p.user.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Avatar
            src={p.user.avatarUrl || null}
            initials={p.user.displayName.charAt(0).toUpperCase()}
            size="xs"
            alt={p.user.displayName}
          />
          <span
            style={{
              flex: 1,
              fontSize: 'var(--font-size-xs)',
              color: p.role === 'host' ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.user.displayName}
          </span>

          {p.role !== 'viewer' && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--color-text-muted)',
                textTransform: 'capitalize',
              }}
            >
              {p.role}
            </span>
          )}

          {canModerate && p.role === 'viewer' && (
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={() => onMuteChat(p.user.id, !p.isChatMuted)}
                aria-label={p.isChatMuted ? 'Unmute chat' : 'Mute chat'}
                title={p.isChatMuted ? 'Unmute chat' : 'Mute chat'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  opacity: 0.6,
                  padding: 2,
                }}
              >
                {p.isChatMuted ? '🔇' : '💬'}
              </button>
              <button
                onClick={() => onKick(p.user.id)}
                aria-label="Kick participant"
                title="Kick"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  opacity: 0.6,
                  padding: 2,
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
