import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../hooks/useOrders';
import { Skeleton } from '../../../shared/components/Skeleton';
import { TimeAgo } from '../../social/shared/TimeAgo';

export const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useOrders();

  const fmt = (m: { amount: number; currency: string }) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currency }).format(m.amount);

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--space-6)' }}>
        <h1 style={{ margin: '0 0 var(--space-6)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
          Order History
        </h1>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 96, borderRadius: 'var(--radius-md)' }} />)}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', paddingTop: 80, color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: 48 }}>📦</span>
            <p style={{ margin: 0 }}>No orders yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {orders.map((order) => (
              <article
                key={order.id}
                onClick={() => navigate(`/commerce/orders/${order.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  background: 'var(--color-surface-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-default)',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
              >
                {/* Thumbnail stack */}
                <div style={{ display: 'flex', position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                  {order.items.slice(0, 2).map((item, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      top: i * 8, left: i * 8,
                      width: 48, height: 48,
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      background: 'var(--color-surface-2)',
                      border: '2px solid var(--color-surface-3)',
                    }}>
                      {item.product.images[0] && (
                        <img src={item.product.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                    #{order.id}
                  </p>
                  <p style={{ margin: '0 0 4px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </p>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}><TimeAgo date={order.placedAt} /></span>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
                    {fmt(order.total)}
                  </p>
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                    color: ORDER_STATUS_COLORS[order.status],
                  }}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>

                <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>›</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
