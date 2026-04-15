import React from 'react';
import type { ProductVariant } from '../../../shared/types/domain';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedId: string;
  onChange: (variantId: string) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedId,
  onChange,
}) => {
  if (variants.length <= 1) return null;

  // Group by attribute keys to render per-attribute chips (e.g., Color, Size)
  const allKeys = Array.from(
    new Set(variants.flatMap((v) => Object.keys(v.attributes)))
  );

  if (allKeys.length === 0) {
    // Fallback: flat list of variant labels
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
          Option
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {variants.map((v) => (
            <VariantChip
              key={v.id}
              label={v.label}
              isSelected={v.id === selectedId}
              isOutOfStock={v.stock === 0}
              onClick={() => onChange(v.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {allKeys.map((key) => {
        const values = Array.from(
          new Set(variants.map((v) => v.attributes[key]).filter(Boolean))
        );
        const selectedVariant = variants.find((v) => v.id === selectedId);
        const activeValue = selectedVariant?.attributes[key];

        return (
          <div key={key}>
            <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
              {key}: <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>{activeValue ?? '—'}</span>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {values.map((val) => {
                const matchingVariant = variants.find(
                  (v) => v.attributes[key] === val &&
                    (selectedVariant
                      ? Object.entries(selectedVariant.attributes)
                          .every(([k, v2]) => k === key || v.attributes[k] === v2)
                      : true)
                ) ?? variants.find((v) => v.attributes[key] === val);
                return (
                  <VariantChip
                    key={val}
                    label={val}
                    isSelected={activeValue === val}
                    isOutOfStock={!matchingVariant || matchingVariant.stock === 0}
                    onClick={() => {
                      if (matchingVariant) onChange(matchingVariant.id);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const VariantChip: React.FC<{
  label: string;
  isSelected: boolean;
  isOutOfStock: boolean;
  onClick: () => void;
}> = ({ label, isSelected, isOutOfStock, onClick }) => (
  <button
    onClick={onClick}
    disabled={isOutOfStock}
    aria-pressed={isSelected}
    style={{
      padding: 'var(--space-1) var(--space-3)',
      borderRadius: 'var(--radius-sm)',
      border: isSelected
        ? '2px solid var(--color-brand-primary)'
        : '2px solid rgba(255,255,255,0.1)',
      background: isSelected ? 'rgba(var(--color-brand-rgb, 99,102,241), 0.15)' : 'transparent',
      color: isOutOfStock
        ? 'var(--color-text-muted)'
        : isSelected
        ? 'var(--color-brand-primary)'
        : 'var(--color-text-secondary)',
      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
      fontSize: 'var(--font-size-sm)',
      fontFamily: 'inherit',
      textDecoration: isOutOfStock ? 'line-through' : 'none',
      transition: 'border-color var(--transition-fast), color var(--transition-fast)',
    }}
  >
    {label}
  </button>
);
