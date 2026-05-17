import React, { useEffect, useState } from 'react';
import { Icon } from '../../shared/components/Icon';
import { WifiOff } from '../../shared/components/iconRegistry';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: 'var(--color-danger)',
        color: '#fff',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
        textAlign: 'center',
        padding: '6px var(--space-4)',
        flexShrink: 0,
        zIndex: 'var(--z-toast)' as unknown as number,
      }}
    >
      <Icon icon={WifiOff} size={16} style={{ flexShrink: 0 }} /> You are offline. Some features may be unavailable.
    </div>
  );
};
