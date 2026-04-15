import React, { useState } from 'react';
import { Button } from '../../../../shared/components/Button';
import { useSetSlowMode } from '../../hooks/useTheaterChat';

interface ChatModToolsProps {
  theaterId: string;
}

export const ChatModTools: React.FC<ChatModToolsProps> = ({ theaterId }) => {
  const [slowMode, setSlowModeLocal] = useState(0);
  const setSlowMode = useSetSlowMode(theaterId);

  const SLOW_OPTIONS = [
    { label: 'Off', value: 0 },
    { label: '3s', value: 3 },
    { label: '5s', value: 5 },
    { label: '10s', value: 10 },
    { label: '30s', value: 30 },
  ];

  const handleSlowMode = (seconds: number) => {
    setSlowModeLocal(seconds);
    setSlowMode.mutate(seconds);
  };

  return (
    <div
      style={{
        padding: 'var(--space-3)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
        }}
      >
        Chat Moderation
      </p>

      <div>
        <p
          style={{
            margin: '0 0 var(--space-2)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Slow mode
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
          {SLOW_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={slowMode === opt.value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleSlowMode(opt.value)}
              style={{ minWidth: 36 }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
