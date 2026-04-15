import React from 'react';
import type { CommentSort } from '../../hooks/useComments';

interface CommentSortProps {
  sort: CommentSort;
  onChange: (sort: CommentSort) => void;
}

const OPTIONS: { value: CommentSort; label: string }[] = [
  { value: 'best', label: 'Best' },
  { value: 'new', label: 'New' },
  { value: 'top', label: 'Top' },
  { value: 'controversial', label: 'Controversial' },
];

export const CommentSortControl: React.FC<CommentSortProps> = ({ sort, onChange }) => (
  <div
    style={{
      display: 'flex',
      gap: 'var(--space-1)',
      alignItems: 'center',
      marginBottom: 'var(--space-3)',
    }}
  >
    <span
      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginRight: 4 }}
    >
      Sort by:
    </span>
    {OPTIONS.map((opt) => {
      const active = sort === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '2px 10px',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-xs)',
            fontWeight: (active
              ? 'var(--font-weight-semibold)'
              : 'var(--font-weight-normal)') as React.CSSProperties['fontWeight'],
            background: active ? 'var(--color-brand-primary)' : 'var(--color-surface-3)',
            color: active ? '#fff' : 'var(--color-text-secondary)',
            transition: 'background var(--transition-fast)',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
