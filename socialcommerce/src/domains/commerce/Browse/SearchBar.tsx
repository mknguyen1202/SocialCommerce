import React, { useState, useRef, useEffect } from 'react';
import { useCommerceStore } from '../stores/commerceStore';

export const SearchBar: React.FC = () => {
  const { filters, patchFilters } = useCommerceStore();
  const [draft, setDraft] = useState(filters.q ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setDraft(filters.q ?? '');
  }, [filters.q]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleChange = (val: string) => {
    setDraft(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patchFilters({ q: val || undefined });
    }, 350);
  };

  const clear = () => {
    setDraft('');
    patchFilters({ q: undefined });
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{
        position: 'absolute', left: 10,
        color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', pointerEvents: 'none',
      }}>
        🔍
      </span>
      <input
        type="search"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
        style={{
          width: 260,
          background: 'var(--color-surface-2)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-sm)',
          padding: 'var(--space-2) var(--space-3) var(--space-2) 32px',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />
      {draft && (
        <button
          onClick={clear}
          aria-label="Clear search"
          style={{
            position: 'absolute', right: 8,
            background: 'none', border: 'none',
            color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14, padding: 2,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
