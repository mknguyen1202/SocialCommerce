import React from 'react';
import { THEATER_CATEGORIES } from '../hooks/useTheaters';

interface CategoryFilterProps {
  selected: string | null;
  onChange: (cat: string | null) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onChange }) => {
  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: (active
      ? 'var(--font-weight-semibold)'
      : 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--color-brand-primary)' : 'var(--color-surface-3)',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  });

  return (
    <div
      role="group"
      aria-label="Filter by category"
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}
    >
      <button style={chipStyle(selected === null)} onClick={() => onChange(null)}>
        All
      </button>
      {THEATER_CATEGORIES.map((cat) => (
        <button
          key={cat}
          style={chipStyle(selected === cat)}
          onClick={() => onChange(selected === cat ? null : cat)}
          aria-pressed={selected === cat}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};
