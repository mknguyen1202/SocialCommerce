import React from 'react';
import type { Cart } from '../../../shared/types/domain';
import { Button } from '../../../shared/components/Button';

interface CartSummaryProps {
  cart: Cart;
  onCheckout: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({ cart, onCheckout }) => {
  const fmt = (m: { amount: number; currency: string }) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currency }).format(m.amount);

  const isEmpty = cart.itemCount === 0;

  return (
    <div style={{
      background: 'var(--color-surface-3)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
    }}>
      <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
        Order Summary
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Row label={`Subtotal (${cart.itemCount} item${cart.itemCount !== 1 ? 's' : ''})`} value={fmt(cart.subtotal)} />
        {cart.discount && (
          <Row label={`Coupon (${cart.couponCode})`} value={`−${fmt(cart.discount)}`} valueColor="var(--color-success)" />
        )}
        <Row label="Shipping" value="Calculated at checkout" muted />
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
            Estimated Total
          </span>
          <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
            {fmt({
              amount: cart.subtotal.amount - (cart.discount?.amount ?? 0),
              currency: cart.subtotal.currency,
            })}
          </span>
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={onCheckout}
        disabled={isEmpty}
        style={{ width: '100%' }}
      >
        Proceed to Checkout →
      </Button>

      <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
        🔒 Secure checkout
      </p>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; valueColor?: string; muted?: boolean }> = ({
  label, value, valueColor, muted,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 'var(--font-size-sm)', color: muted ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>
      {label}
    </span>
    <span style={{ fontSize: 'var(--font-size-sm)', color: valueColor ?? (muted ? 'var(--color-text-muted)' : 'var(--color-text-primary)') }}>
      {value}
    </span>
  </div>
);
