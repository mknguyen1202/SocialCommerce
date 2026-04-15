import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommerceStore } from '../stores/commerceStore';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { CouponInput } from './CouponInput';
import { Button } from '../../../shared/components/Button';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart } = useCommerceStore();

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/commerce')}>← Continue Shopping</Button>
          <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
            Shopping Cart
          </h1>
        </div>

        {cart.items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', paddingTop: 80, color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: 64 }}>🛒</span>
            <p style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Your cart is empty.</p>
            <Button onClick={() => navigate('/commerce')}>Browse Products</Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-6)', alignItems: 'start' }}>
            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {cart.items.map((item) => (
                <CartItem key={`${item.product.id}-${item.variant.id}`} item={item} />
              ))}
              <CouponInput />
            </div>

            {/* Summary */}
            <CartSummary cart={cart} onCheckout={() => navigate('/commerce/checkout')} />
          </div>
        )}
      </div>
    </div>
  );
};
