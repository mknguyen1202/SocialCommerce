import React from 'react';
import type { CartItem as CartItemType } from '../../../shared/types/domain';
import { PriceDisplay } from '../Product/PriceDisplay';
import { useCommerceStore } from '../stores/commerceStore';

interface CartItemProps {
  item: CartItemType;
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { removeFromCart, updateQuantity } = useCommerceStore();
  const image = item.product.images[0];
  const lineTotal = { amount: item.variant.price.amount * item.quantity, currency: item.variant.price.currency };

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: 'var(--color-surface-3)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border-default)',
    }}>
      {/* Thumbnail */}
      <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: 'var(--color-surface-2)' }}>
        {image ? (
          <img src={image.url} alt={image.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--color-text-muted)' }}>🛒</div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.product.title}
        </p>
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          {item.variant.label}
        </p>
        <PriceDisplay price={item.variant.price} size="sm" />

        {/* Quantity controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <button
              onClick={() => {
                if (item.quantity <= 1) removeFromCart(item.product.id, item.variant.id);
                else updateQuantity(item.product.id, item.variant.id, item.quantity - 1);
              }}
              aria-label="Decrease quantity"
              style={ctrlBtn}
            >
              −
            </button>
            <span style={{ width: 32, textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.product.id, item.variant.id, item.quantity + 1)}
              aria-label="Increase quantity"
              style={ctrlBtn}
            >
              +
            </button>
          </div>
          <button
            onClick={() => removeFromCart(item.product.id, item.variant.id)}
            aria-label="Remove item"
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', padding: 0 }}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Line total */}
      <div style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
        <PriceDisplay price={lineTotal} size="sm" />
      </div>
    </div>
  );
};

const ctrlBtn: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--color-text-primary)',
  cursor: 'pointer', width: 24, height: 24,
  fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
};
