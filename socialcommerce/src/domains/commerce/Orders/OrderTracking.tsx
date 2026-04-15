import React from 'react';
import type { OrderStatus } from '../../../shared/types/domain';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../hooks/useOrders';

interface OrderTrackingProps {
  status: OrderStatus;
  placedAt: Date;
  updatedAt: Date;
}

const TRACKING_STEPS: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

export const OrderTracking: React.FC<OrderTrackingProps> = ({ status, placedAt: _placedAt, updatedAt: _updatedAt }) => {
  const isTerminal = status === 'cancelled' || status === 'refunded';
  const activeIndex = TRACKING_STEPS.indexOf(status);

  if (isTerminal) {
    return (
      <div style={{
        padding: 'var(--space-4)',
        background: 'var(--color-surface-3)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-default)',
      }}>
        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: ORDER_STATUS_COLORS[status] }}>
          Order {ORDER_STATUS_LABELS[status]}
        </p>
      </div>
    );
  }

  const ICONS: Record<OrderStatus, string> = {
    pending: '🕐', confirmed: '✅', shipped: '🚚', delivered: '📦',
    cancelled: '❌', refunded: '↩️',
  };

  return (
    <div style={{
      padding: 'var(--space-4)',
      background: 'var(--color-surface-3)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border-default)',
    }}>
      <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>
        Order Status
      </h3>

      {/* Timeline */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        {TRACKING_STEPS.map((step, i) => {
          const done = i <= activeIndex;
          const isActive = i === activeIndex;
          return (
            <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Node */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done ? ORDER_STATUS_COLORS[step] : 'var(--color-surface-2)',
                border: `2px solid ${done ? ORDER_STATUS_COLORS[step] : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, zIndex: 1, position: 'relative',
                boxShadow: isActive ? `0 0 0 4px rgba(99,102,241,0.2)` : 'none',
                transition: 'background var(--transition-fast)',
              }}>
                {ICONS[step]}
              </div>

              {/* Connector */}
              {i < TRACKING_STEPS.length - 1 && (
                <div style={{
                  position: 'absolute',
                  marginLeft: 32,
                  height: 2,
                  width: '100%',
                  background: done && i < activeIndex ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.1)',
                  top: 15,
                }} />
              )}

              {/* Label */}
              <p style={{
                margin: 'var(--space-2) 0 0',
                fontSize: 'var(--font-size-xs)',
                color: isActive ? 'var(--color-text-primary)' : done ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                fontWeight: isActive ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight']) : undefined,
                textAlign: 'center',
              }}>
                {ORDER_STATUS_LABELS[step]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
