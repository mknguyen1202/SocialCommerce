import React from 'react';
import { useStreamingStore } from '../stores/streamingStore';

export const TheaterSearch: React.FC = () => {
  const { searchQuery, setSearchQuery } = useStreamingStore();

  return (
    <input
      type="search"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search theaters…"
      aria-label="Search theaters"
      style={{
        width: '100%',
        background: 'var(--color-surface-3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--font-size-sm)',
        padding: 'var(--space-2) var(--space-4)',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
      }}
    />
  );
};
