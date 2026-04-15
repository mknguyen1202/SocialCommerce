import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder, useCancelOrder, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../hooks/useOrders';
import { OrderTracking } from './OrderTracking';
import { Skeleton } from '../../../shared/components/Skeleton';
import { Button } from '../../../shared/components/Button';

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(id!);
  const cancelOrder = useCancelOrder();

  const fmt = (m: { amount: number; currency: string }) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currency }).format(m.amount);

  if (isLoading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Skeleton width={300} height={32} />
        <Skeleton height={120} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
        <span style={{ fontSize: 48 }}>😕</span>
        <p style={{ margin: 0 }}>Order not found.</p>
        <Button variant="secondary" onClick={() => navigate('/commerce/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const canCancel = order.status === 'pending' || order.status === 'confirmed';

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/commerce/orders')}>←</Button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
              Order <span style={{ fontFamily: 'monospace' }}>#{order.id}</span>
            </h1>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: ORDER_STATUS_COLORS[order.status] }}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              isLoading={cancelOrder.isPending}
              onClick={() => cancelOrder.mutate(order.id)}
            >
              Cancel Order
            </Button>
          )}
        </div>

        {/* Tracking */}
        <OrderTracking status={order.status} placedAt={order.placedAt} updatedAt={order.updatedAt} />

        {/* Items */}
        <section style={card}>
          <h2 style={sectionTitle}>Items</h2>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--color-surface-2)', flexShrink: 0 }}>
                {item.product.images[0] && <img src={item.product.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>{item.product.title}</p>
                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{item.variant.label} × {item.quantity}</p>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>{fmt(item.lineTotal)}</p>
            </div>
          ))}
        </section>

        {/* Address + Payment row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <section style={card}>
            <h2 style={sectionTitle}>Shipping Address</h2>
            <p style={textMuted}>{order.shippingAddress.fullName}</p>
            <p style={textMuted}>{order.shippingAddress.line1}</p>
            {order.shippingAddress.line2 && <p style={textMuted}>{order.shippingAddress.line2}</p>}
            <p style={textMuted}>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
          </section>
          <section style={card}>
            <h2 style={sectionTitle}>Payment</h2>
            <p style={textMuted}>💳 {order.paymentMethod.label}{order.paymentMethod.last4 ? ` ····${order.paymentMethod.last4}` : ''}</p>
          </section>
        </div>

        {/* Totals */}
        <section style={card}>
          <TotalRow label="Subtotal" value={fmt(order.subtotal)} />
          <TotalRow label="Shipping" value={fmt(order.shipping)} />
          <TotalRow label="Tax" value={fmt(order.tax)} />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <TotalRow label="Total" value={fmt(order.total)} bold />
          </div>
        </section>
      </div>
    </div>
  );
};

const TotalRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: bold ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight']) : undefined }}>{label}</span>
    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: bold ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight']) : undefined }}>{value}</span>
  </div>
);

const card: React.CSSProperties = { background: 'var(--color-surface-3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', border: '1px solid var(--color-border-default)' };
const sectionTitle: React.CSSProperties = { margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' };
const textMuted: React.CSSProperties = { margin: '0 0 2px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' };
