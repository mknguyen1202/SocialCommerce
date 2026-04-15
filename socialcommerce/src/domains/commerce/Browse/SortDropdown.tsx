import React from 'react';
import { useCommerceStore } from '../stores/commerceStore';
import { SORT_OPTIONS } from '../hooks/useProducts';

export const SortDropdown: React.FC = () => {
  const { filters, patchFilters } = useCommerceStore();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <label
        htmlFor="product-sort"
        style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
      >
        Sort by
      </label>
      <select
        id="product-sort"
        value={filters.sort ?? 'best_selling'}
        onChange={(e) => patchFilters({ sort: e.target.value as typeof filters['sort'] })}
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-sm)',
          padding: 'var(--space-1) var(--space-3) var(--space-1) var(--space-2)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
