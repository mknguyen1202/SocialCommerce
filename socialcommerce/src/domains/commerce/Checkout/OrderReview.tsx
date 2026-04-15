import React from 'react';
import type { Cart, Address, PaymentMethodSummary } from '../../../shared/types/domain';
import { CartItem } from '../Cart/CartItem';
import { Button } from '../../../shared/components/Button';

interface OrderReviewProps {
  cart: Cart;
  address: Address;
  paymentMethod: PaymentMethodSummary;
  isPlacing: boolean;
  onPlace: () => void;
  onBack: () => void;
}

export const OrderReview: React.FC<OrderReviewProps> = ({
  cart, address, paymentMethod, isPlacing, onPlace, onBack,
}) => {
  const fmt = (m: { amount: number; currency: string }) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currency }).format(m.amount);

  const estimatedTotal = { amount: cart.subtotal.amount - (cart.discount?.amount ?? 0), currency: cart.subtotal.currency };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Items */}
      <section>
        <h3 style={sectionTitle}>Items ({cart.itemCount})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {cart.items.map((item) => (
            <CartItem key={`${item.product.id}-${item.variant.id}`} item={item} />
          ))}
        </div>
      </section>

      {/* Address */}
      <section>
        <h3 style={sectionTitle}>Shipping Address</h3>
        <div style={cardStyle}>
          <p style={textStyle}>{address.fullName}</p>
          <p style={textStyle}>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
          <p style={textStyle}>{address.city}, {address.state} {address.postalCode}</p>
          <p style={textStyle}>{address.country}</p>
        </div>
      </section>

      {/* Payment */}
      <section>
        <h3 style={sectionTitle}>Payment</h3>
        <div style={cardStyle}>
          <p style={textStyle}>
            💳 {paymentMethod.label}
            {paymentMethod.last4 ? ` ····${paymentMethod.last4}` : ''}
          </p>
        </div>
      </section>

      {/* Totals */}
      <section style={cardStyle}>
        <Row label="Subtotal" value={fmt(cart.subtotal)} />
        {cart.discount && <Row label={`Discount (${cart.couponCode})`} value={`−${fmt(cart.discount)}`} valueColor="var(--color-success)" />}
        <Row label="Shipping" value="Free" />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          <Row label="Total" value={fmt(estimatedTotal)} bold />
        </div>
      </section>

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
        <Button variant="ghost" onClick={onBack} disabled={isPlacing}>← Back</Button>
        <Button variant="primary" size="lg" onClick={onPlace} isLoading={isPlacing}>
          Place Order
        </Button>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; valueColor?: string; bold?: boolean }> = ({
  label, value, valueColor, bold,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: bold ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight']) : undefined }}>{label}</span>
    <span style={{ fontSize: 'var(--font-size-sm)', color: valueColor ?? 'var(--color-text-primary)', fontWeight: bold ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight']) : undefined }}>{value}</span>
  </div>
);

const sectionTitle: React.CSSProperties = {
  margin: '0 0 var(--space-2)',
  fontSize: 'var(--font-size-md)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-text-primary)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface-3)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
  border: '1px solid var(--color-border-default)',
};

const textStyle: React.CSSProperties = {
  margin: '0 0 2px',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-secondary)',
};
