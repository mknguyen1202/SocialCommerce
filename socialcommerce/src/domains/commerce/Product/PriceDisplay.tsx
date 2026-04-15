import React from 'react';
import type { Money } from '../../../shared/types/domain';

interface PriceDisplayProps {
  price: Money;
  compareAtPrice?: Money;
  size?: 'sm' | 'md' | 'lg';
}

const FONT_SIZES = { sm: 'var(--font-size-sm)', md: 'var(--font-size-md)', lg: 'var(--font-size-xl)' };

const formatterCache = new Map<string, Intl.NumberFormat>();
function getFormatter(currency: string) {
  let f = formatterCache.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    formatterCache.set(currency, f);
  }
  return f;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  compareAtPrice,
  size = 'md',
}) => {
  const fmt = (m: Money) => getFormatter(m.currency).format(m.amount);

  const isSale = compareAtPrice && compareAtPrice.amount > price.amount;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
      <span
        style={{
          fontSize: FONT_SIZES[size],
          fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
          color: isSale ? 'var(--color-danger)' : 'var(--color-text-primary)',
        }}
      >
        {fmt(price)}
      </span>
      {isSale && (
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            textDecoration: 'line-through',
          }}
        >
          {fmt(compareAtPrice!)}
        </span>
      )}
    </span>
  );
};
