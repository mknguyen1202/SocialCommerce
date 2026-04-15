import React from 'react';
import { useCallStore } from '../stores/callStore';
import { CallControls } from './CallControls';
import { UserAvatar } from '../shared/UserAvatar';

export const CallFloatingWindow: React.FC = () => {
  const { activeCall, isMinimized, setMinimized } = useCallStore();

  if (!activeCall || activeCall.status === 'ended') return null;

  if (isMinimized) {
    return (
      <div
        aria-label="Active call — click to expand"
        style={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          zIndex: 'var(--z-modal)' as unknown as number,
          background: 'var(--color-surface-0)',
          borderRadius: 'var(--radius-xl)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: 'var(--shadow-lg)',
          cursor: 'pointer',
          border: '1px solid var(--color-surface-3)',
        }}
        onClick={() => setMinimized(false)}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--color-success)',
            flexShrink: 0,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 500 }}>
          {activeCall.type === 'video' ? '📹' : '📞'} Call in progress · {activeCall.participants.length}
        </span>
        <div style={{ display: 'flex' }}>
          {activeCall.participants.slice(0, 3).map((p) => (
            <UserAvatar key={p.user.id} user={p.user} size="xs" showPresence={false} style={{ marginLeft: -4 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 20,
        zIndex: 'var(--z-modal)' as unknown as number,
        width: 320,
        background: 'var(--color-surface-0)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-surface-3)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {activeCall.type === 'video' ? '📹 Video Call' : '📞 Voice Call'}
        </span>
        <button
          aria-label="Minimize call"
          onClick={() => setMinimized(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16 }}
        >
          ⌄
        </button>
      </div>

      {/* Participants */}
      <div style={{ padding: '12px 12px 4px', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {activeCall.participants.map((p) => (
          <div key={p.user.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <UserAvatar user={p.user} size="md" showPresence={false} />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {p.user.displayName.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ padding: '8px 12px 14px' }}>
        <CallControls />
      </div>
    </div>
  );
};
