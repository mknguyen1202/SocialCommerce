import React from 'react';

export type ReviewSortOption = 'newest' | 'most_helpful' | 'highest' | 'lowest';

interface ReviewSortProps {
  value: ReviewSortOption;
  onChange: (value: ReviewSortOption) => void;
}

const OPTIONS: { value: ReviewSortOption; label: string }[] = [
  { value: 'most_helpful', label: 'Most Helpful' },
  { value: 'newest', label: 'Newest' },
  { value: 'highest', label: 'Highest Rating' },
  { value: 'lowest', label: 'Lowest Rating' },
];

export const ReviewSort: React.FC<ReviewSortProps> = ({ value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
    <label
      htmlFor="review-sort"
      style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
    >
      Sort by
    </label>
    <select
      id="review-sort"
      value={value}
      onChange={(e) => onChange(e.target.value as ReviewSortOption)}
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--font-size-sm)',
        padding: 'var(--space-1) var(--space-2)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        outline: 'none',
      }}
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
