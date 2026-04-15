import React, { useEffect, useState } from 'react';

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
      🌐 You are offline. Some features may be unavailable.
    </div>
  );
};
