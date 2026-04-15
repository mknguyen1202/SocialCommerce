import React from 'react';

interface NewPostsBannerProps {
  count: number;
  onRefresh: () => void;
}

export const NewPostsBanner: React.FC<NewPostsBannerProps> = ({ count, onRefresh }) => {
  if (count === 0) return null;
  return (
    <button
      onClick={onRefresh}
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 'var(--space-3)',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        width: '100%',
        padding: 'var(--space-2) var(--space-4)',
        background: 'var(--color-brand-primary)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        cursor: 'pointer',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
        boxShadow: 'var(--shadow-md)',
        marginBottom: 'var(--space-3)',
        transition: 'transform var(--transition-fast)',
      }}
    >
      ↑ {count} new post{count !== 1 ? 's' : ''} — click to refresh
    </button>
  );
};
