import React, { useState } from 'react';
import { useCommerceStore } from '../stores/commerceStore';
import { Button } from '../../../shared/components/Button';

export const FilterPanel: React.FC = () => {
  const { filters, patchFilters, resetFilters } = useCommerceStore();
  const [isOpen, setIsOpen] = useState(false);

  const [localMin, setLocalMin] = useState(String(filters.minPrice ?? ''));
  const [localMax, setLocalMax] = useState(String(filters.maxPrice ?? ''));

  const applyPrice = () => {
    patchFilters({
      minPrice: localMin ? Number(localMin) : undefined,
      maxPrice: localMax ? Number(localMax) : undefined,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalMin('');
    setLocalMax('');
    resetFilters();
    setIsOpen(false);
  };

  const activeCount = [
    filters.minPrice, filters.maxPrice, filters.minRating, filters.vendorId,
  ].filter(Boolean).length;

  return (
    <div style={{ position: 'relative' }}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        🔧 Filters{activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          />
          <div
            role="dialog"
            aria-label="Product filters"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              zIndex: 11,
              background: 'var(--color-surface-2)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              width: 260,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            {/* Price range */}
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              <legend style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
                Price Range
              </legend>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  min={0}
                  style={inputStyle}
                  aria-label="Minimum price"
                />
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  min={0}
                  style={inputStyle}
                  aria-label="Maximum price"
                />
              </div>
            </fieldset>

            {/* Min rating */}
            <div>
              <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
                Minimum Rating
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => patchFilters({ minRating: filters.minRating === star ? undefined : star })}
                    aria-pressed={filters.minRating === star}
                    style={{
                      background: filters.minRating === star ? 'var(--color-brand-primary)' : 'var(--color-surface-3)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: filters.minRating === star ? '#fff' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      padding: 'var(--space-1) var(--space-2)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    {star}★
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="primary" size="sm" style={{ flex: 1 }} onClick={applyPrice}>
                Apply
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--color-surface-3)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-sm)',
  padding: 'var(--space-1) var(--space-2)',
  fontFamily: 'inherit',
  outline: 'none',
  width: 0,
};
