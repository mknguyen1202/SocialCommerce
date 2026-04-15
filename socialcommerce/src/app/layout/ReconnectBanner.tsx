import React from 'react';
import { useSocketStatus } from '../../shared/realtime/useSocket';
import { useUIStore } from '../stores/uiStore';

export const ReconnectBanner: React.FC = () => {
  const socketStatus = useSocketStatus();
  const setReconnectBanner = useUIStore((s) => s.setReconnectBanner);

  // Sync banner state with socket status
  React.useEffect(() => {
    setReconnectBanner(socketStatus === 'reconnecting');
  }, [socketStatus, setReconnectBanner]);

  if (socketStatus !== 'reconnecting') return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: 'var(--color-warning)',
        color: '#000',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
        textAlign: 'center',
        padding: '6px var(--space-4)',
        zIndex: 'var(--z-toast)' as unknown as number,
        flexShrink: 0,
      }}
    >
      ⚠️ Reconnecting to real-time services…
    </div>
  );
};
