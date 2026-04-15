import React from 'react';
import type { Presence } from '../types/domain';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
};

const PRESENCE_COLOR: Record<Presence, string> = {
  online: 'var(--color-success)',
  offline: 'var(--color-text-muted)',
  idle: 'var(--color-warning)',
  dnd: 'var(--color-danger)',
};

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  initials?: string;
  name?: string;
  size?: AvatarSize;
  presence?: Presence;
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  initials,
  name,
  size = 'md',
  presence,
  style,
}) => {
  const px = SIZE_MAP[size];
  const fontSize = Math.round(px * 0.38);
  const displayInitials = initials ??
    (name
      ? name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase()
      : '?');

  return (
    <span
      role="img"
      aria-label={alt || displayInitials}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: px,
        height: px,
        borderRadius: 'var(--radius-full)',
        flexShrink: 0,
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          width={px}
          height={px}
          style={{ borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
        />
      ) : (
        <span
          style={{
            width: px,
            height: px,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface-3)',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize,
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            userSelect: 'none',
          }}
        >
          {displayInitials.slice(0, 2).toUpperCase()}
        </span>
      )}

      {presence && (
        <span
          aria-label={presence}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: Math.max(8, Math.round(px * 0.28)),
            height: Math.max(8, Math.round(px * 0.28)),
            borderRadius: 'var(--radius-full)',
            background: PRESENCE_COLOR[presence],
            border: '2px solid var(--color-surface-1)',
          }}
        />
      )}
    </span>
  );
};
