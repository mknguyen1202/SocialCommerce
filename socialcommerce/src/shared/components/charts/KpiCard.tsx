import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number; // % change vs prior period
  icon?: string;
  suffix?: string;
  style?: React.CSSProperties;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, change, icon, suffix, style }) => {
  const positive = change !== undefined && change >= 0;
  return (
    <div
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        minWidth: 140,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {icon && <span aria-hidden="true" style={{ fontSize: 18 }}>{icon}</span>}
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-1)' }}>
        <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)', lineHeight: 1 }}>
          {value}
        </span>
        {suffix && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{suffix}</span>}
      </div>
      {change !== undefined && (
        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: positive ? 'var(--color-success)' : 'var(--color-danger)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
          {Math.abs(change).toFixed(1)}% vs prev period
        </span>
      )}
    </div>
  );
};
