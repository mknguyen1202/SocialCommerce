import React from 'react';
import type { Presence } from '../../../shared/types/domain';

const COLOR: Record<Presence, string> = {
  online: 'var(--color-success)',
  offline: 'var(--color-text-muted)',
  idle: 'var(--color-warning)',
  dnd: 'var(--color-danger)',
};

const LABEL: Record<Presence, string> = {
  online: 'Online',
  offline: 'Offline',
  idle: 'Away',
  dnd: 'Do Not Disturb',
};

interface PresenceDotProps {
  presence: Presence;
  size?: number;
}

export const PresenceDot: React.FC<PresenceDotProps> = React.memo(({ presence, size = 10 }) => (
  <span
    aria-label={LABEL[presence]}
    title={LABEL[presence]}
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: COLOR[presence],
      border: '2px solid var(--color-surface-1)',
      flexShrink: 0,
    }}
  />
));
