import React from 'react';

type BadgeVariant = 'default' | 'brand' | 'success' | 'warning' | 'danger';

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  default:  { background: 'var(--color-surface-3)',      color: 'var(--color-text-secondary)' },
  brand:    { background: 'var(--color-brand-primary)',   color: '#fff' },
  success:  { background: 'var(--color-success)',         color: '#fff' },
  warning:  { background: 'var(--color-warning)',         color: '#000' },
  danger:   { background: 'var(--color-danger)',          color: '#fff' },
};

export interface BadgeProps {
  count?: number;
  label?: string;
  variant?: BadgeVariant;
  max?: number;
  dot?: boolean;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  count,
  label,
  variant = 'danger',
  max = 99,
  dot = false,
  style,
}) => {
  if (dot) {
    return (
      <span
        aria-label="notification"
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: 'var(--radius-full)',
          ...VARIANT_STYLES[variant],
          ...style,
        }}
      />
    );
  }

  const text = label ?? (count !== undefined ? (count > max ? `${max}+` : String(count)) : null);
  if (!text) return null;

  return (
    <span
      aria-label={`${text} notifications`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
        lineHeight: 1,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {text}
    </span>
  );
};
