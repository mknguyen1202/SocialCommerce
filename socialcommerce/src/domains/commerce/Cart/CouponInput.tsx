import React, { useState } from 'react';
import { useCommerceStore } from '../stores/commerceStore';
import { Button } from '../../../shared/components/Button';

export const CouponInput: React.FC = () => {
  const { cart, applyCoupon } = useCommerceStore();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (cart.couponCode) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
        <span style={{ color: 'var(--color-success)' }}>✓</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>
          Coupon <strong style={{ color: 'var(--color-text-primary)' }}>{cart.couponCode}</strong> applied
        </span>
        <button
          onClick={() => applyCoupon('')}
          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', marginLeft: 'auto' }}
        >
          Remove
        </button>
      </div>
    );
  }

  const handleApply = () => {
    if (!code.trim()) return;
    applyCoupon(code.trim().toUpperCase());
    setStatus('success');
    setCode('');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
          placeholder="Promo code"
          aria-label="Coupon code"
          style={{
            flex: 1,
            background: 'var(--color-surface-2)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            padding: 'var(--space-2) var(--space-3)',
            fontFamily: 'inherit',
            outline: 'none',
            textTransform: 'uppercase',
          }}
        />
        <Button variant="secondary" size="sm" onClick={handleApply} disabled={!code.trim()}>
          Apply
        </Button>
      </div>
      {status === 'success' && (
        <p role="status" style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>
          Coupon applied!
        </p>
      )}
    </div>
  );
};
