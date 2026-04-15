import React from 'react';

type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  lines?: number;
  style?: React.CSSProperties;
}

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--color-surface-3) 25%, var(--color-surface-2) 50%, var(--color-surface-3) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s ease infinite',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width = '100%',
  height = 16,
  lines = 1,
  style,
}) => {
  if (variant === 'text' && lines > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style }}>
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            style={{
              display: 'block',
              width: i === lines - 1 ? '70%' : '100%',
              height,
              borderRadius: 'var(--radius-sm)',
              ...shimmer,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <span
      role="progressbar"
      aria-label="Loading…"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: variant === 'circle' ? 'var(--radius-full)' : 'var(--radius-sm)',
        ...shimmer,
        ...style,
      }}
    />
  );
};
