import React from 'react';
import { useCallStore } from '../stores/callStore';
import { UserAvatar } from '../shared/UserAvatar';
import { useSocket } from '../../../shared/realtime/useSocket';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import { PhoneOff, Phone, Video } from '../../../shared/components/iconRegistry';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, setActiveCall, setIncomingCall } = useCallStore();
  const { send } = useSocket('call');

  if (!incomingCall) return null;

  const caller =
    incomingCall.participants.find((p) => p.user.id !== '') ?? incomingCall.participants[0];

  const accept = () => {
    send('call:accept', { callId: incomingCall.id });
    setActiveCall({ ...incomingCall, status: 'active' });
  };

  const decline = () => {
    send('call:decline', { callId: incomingCall.id });
    setIncomingCall(null);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
      style={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 'var(--z-modal)' as unknown as number,
        width: 300,
        background: 'var(--color-surface-0)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-surface-3)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {caller && <UserAvatar user={caller.user} size="lg" showPresence={false} />}

      <div style={{ textAlign: 'center' }}>
        <p
          id="incoming-call-title"
          style={{
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            marginBottom: 2,
          }}
        >
          {caller?.user.displayName ?? 'Unknown'}
        </p>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Incoming {incomingCall.type} call…
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <Button
          variant="danger"
          onClick={decline}
          aria-label="Decline call"
          style={{ borderRadius: 'var(--radius-full)', width: 52, height: 52, justifyContent: 'center' }}
        >
          <Icon icon={PhoneOff} size={22} />
        </Button>
        <Button
          variant="primary"
          onClick={accept}
          aria-label="Accept call"
          style={{
            borderRadius: 'var(--radius-full)',
            width: 52,
            height: 52,
            justifyContent: 'center',
            background: 'var(--color-success)',
          }}
        >
          <Icon icon={incomingCall.type === 'video' ? Video : Phone} size={22} />
        </Button>
      </div>
    </div>
  );
};
