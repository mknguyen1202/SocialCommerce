import React from 'react';

interface ViewerCountProps {
  count: number;
}

export const ViewerCount: React.FC<ViewerCountProps> = ({ count }) => {
  const formatted = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);

  return (
    <span
      aria-label={`${count} viewers`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-muted)',
      }}
    >
      <span aria-hidden="true">👁</span>
      {formatted}
    </span>
  );
};
