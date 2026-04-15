import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Order } from '../../../shared/types/domain';
import { Button } from '../../../shared/components/Button';

interface OrderConfirmationProps {
  order: Order;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ order }) => {
  const navigate = useNavigate();
  const fmt = (m: { amount: number; currency: string }) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currency }).format(m.amount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)', padding: 'var(--space-8)', textAlign: 'center' }}>
      {/* Success icon */}
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
        ✓
      </div>

      <div>
        <h1 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
          Order Placed!
        </h1>
        <p style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)' }}>
          Thank you for your order. We'll send you a confirmation email shortly.
        </p>
      </div>

      {/* Order summary card */}
      <div style={{
        background: 'var(--color-surface-3)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-5)',
        border: '1px solid rgba(255,255,255,0.06)',
        width: '100%',
        maxWidth: 480,
        textAlign: 'left',
      }}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Order ID</span>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
            #{order.id}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {item.product.title} × {item.quantity}
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                {fmt(item.lineTotal)}
              </span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
            Total
          </span>
          <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
            {fmt(order.total)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button onClick={() => navigate(`/commerce/orders/${order.id}`)}>
          Track Order
        </Button>
        <Button variant="secondary" onClick={() => navigate('/commerce')}>
          Continue Shopping
        </Button>
      </div>
    </div>
  );
};
