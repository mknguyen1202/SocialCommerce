import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommerceStore } from '../stores/commerceStore';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { CouponInput } from './CouponInput';
import { Button } from '../../../shared/components/Button';

export const MiniCart: React.FC = () => {
  const navigate = useNavigate();
  const { cart, isMiniCartOpen, closeMiniCart, clearCart } = useCommerceStore();

  if (!isMiniCartOpen) return null;

  const goToCheckout = () => {
    closeMiniCart();
    navigate('/commerce/checkout');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeMiniCart}
        style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.4)' }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          zIndex: 41,
          background: 'var(--color-surface-1)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
            Cart ({cart.itemCount})
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {cart.itemCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>Clear</Button>
            )}
            <button
              onClick={closeMiniCart}
              aria-label="Close cart"
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 20 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {cart.items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', paddingTop: 60, color: 'var(--color-text-muted)' }}>
              <span style={{ fontSize: 48 }}>🛒</span>
              <p style={{ margin: 0, textAlign: 'center' }}>Your cart is empty.</p>
              <Button variant="secondary" size="sm" onClick={closeMiniCart}>Continue Shopping</Button>
            </div>
          ) : (
            <>
              {cart.items.map((item) => (
                <CartItem key={`${item.product.id}-${item.variant.id}`} item={item} />
              ))}
              <CouponInput />
            </>
          )}
        </div>

        {/* Footer summary */}
        {cart.items.length > 0 && (
          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <CartSummary cart={cart} onCheckout={goToCheckout} />
          </div>
        )}
      </aside>
    </>
  );
};
