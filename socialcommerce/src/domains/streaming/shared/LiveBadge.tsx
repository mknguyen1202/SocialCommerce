import React from 'react';

export const LiveBadge: React.FC = React.memo(() => (
  <span
    aria-label="Live"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: 'var(--color-danger)',
      color: '#fff',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
      letterSpacing: '0.08em',
      padding: '2px 7px',
      borderRadius: 'var(--radius-sm)',
      textTransform: 'uppercase',
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 'var(--radius-full)',
        background: '#fff',
        animation: 'pulse 1.4s ease infinite',
        flexShrink: 0,
      }}
    />
    LIVE
  </span>
));
