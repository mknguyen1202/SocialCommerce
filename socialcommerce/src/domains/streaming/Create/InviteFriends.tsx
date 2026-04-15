import React, { useState } from 'react';
import { useInviteToTheater } from '../hooks/useTheaterChat';
import { Button } from '../../../shared/components/Button';

interface InviteFriendsProps {
  theaterId: string;
  onDone: () => void;
}

interface FriendEntry {
  id: string;
  displayName: string;
  avatarUrl: string;
}

// Stub — in production this would fetch from the contacts API
const MOCK_FRIENDS: FriendEntry[] = [
  { id: 'f1', displayName: 'Alice', avatarUrl: '' },
  { id: 'f2', displayName: 'Bob', avatarUrl: '' },
  { id: 'f3', displayName: 'Carol', avatarUrl: '' },
];

export const InviteFriends: React.FC<InviteFriendsProps> = ({ theaterId, onDone }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const invite = useInviteToTheater(theaterId);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleInvite = async () => {
    if (selected.size === 0) return;
    await invite.mutateAsync([...selected]);
    onDone();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
        Select friends to invite:
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {MOCK_FRIENDS.map((f) => (
          <li key={f.id}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: selected.has(f.id) ? 'rgba(var(--color-brand-primary-rgb),0.1)' : 'transparent',
                transition: 'background var(--transition-fast)',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(f.id)}
                onChange={() => toggle(f.id)}
                style={{ accentColor: 'var(--color-brand-primary)' }}
              />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                {f.displayName}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <Button
        variant="primary"
        size="sm"
        disabled={selected.size === 0}
        isLoading={invite.isPending}
        onClick={handleInvite}
      >
        Send Invites ({selected.size})
      </Button>
    </div>
  );
};
