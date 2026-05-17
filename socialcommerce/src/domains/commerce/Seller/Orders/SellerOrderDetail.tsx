import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSellerOrder, useTransitionOrderStatus, useRefundOrder } from '../../hooks/useSellerOrders';
import type { OrderStatus } from '../types';

interface SellerOrderDetailProps {
  shopId: string | null;
  orderId: string | null;
}

const STATUS_STYLES: Record<OrderStatus, { color: string; bg: string }> = {
  PENDING: { color: '#f59e0b', bg: '#f59e0b22' },
  CONFIRMED: { color: '#3b82f6', bg: '#3b82f622' },
  SHIPPED: { color: '#8b5cf6', bg: '#8b5cf622' },
  DELIVERED: { color: '#10b981', bg: '#10b98122' },
  CANCELLED: { color: '#ef4444', bg: '#ef444422' },
  REFUNDED: { color: '#6b7280', bg: '#6b728022' },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

const fmtCurrency = (v: number) => `$${v.toFixed(2)}`;
const fmtDate = (d: Date | string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const SellerOrderDetail: React.FC<SellerOrderDetailProps> = ({ shopId, orderId }) => {
  const navigate = useNavigate();
  const { data: order, isLoading } = useSellerOrder(shopId, orderId);
  const transition = useTransitionOrderStatus(shopId!);
  const refund = useRefundOrder(shopId!);
  const [trackingInput, setTrackingInput] = useState('');
  const [carrierInput, setCarrierInput] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  if (isLoading) return <LoadingSkeleton />;
  if (!order) return (
    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      Order not found.
    </div>
  );

  const s = STATUS_STYLES[order.status];
  const nextStatus = NEXT_STATUS[order.status];

  const handleTransition = async (status: OrderStatus, tracking?: string, carrier?: string) => {
    await transition.mutateAsync({
      orderId: order.id,
      status,
      trackingNumber: tracking,
      carrier,
    });
  };

  const handleShip = async () => {
    if (!trackingInput.trim()) { alert('Enter a tracking number before marking as shipped.'); return; }
    await handleTransition('SHIPPED', trackingInput, carrierInput);
    setTrackingInput('');
    setCarrierInput('');
  };

  const handleRefund = async () => {
    await refund.mutateAsync({ orderId: order.id, reason: refundReason });
    setShowRefundModal(false);
    setRefundReason('');
  };

  return (
    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 900, height: '100%', overflowY: 'auto' }} aria-label="Order detail">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('../orders')} style={backBtnStyle} aria-label="Back to orders">← Orders</button>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)', flex: 1 }}>
          Order #{order.id.slice(-8).toUpperCase()}
        </h1>
        <span style={{ padding: '5px 14px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 'var(--font-size-sm)', color: s.color, background: s.bg }}>
          {order.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Items */}
          <Card title="Order items">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 0', fontWeight: 500 }}>Product</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'right' }}>Unit price</th>
                  <th style={{ padding: '6px 0 6px 12px', fontWeight: 500, textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id} style={{ borderTop: '1px solid var(--color-border-default)' }}>
                    <td style={{ padding: '8px 0' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{item.title}</div>
                      {item.variantLabel && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.variantLabel}</div>}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>{fmtCurrency(item.unitPrice)}</td>
                    <td style={{ padding: '8px 0 8px 12px', textAlign: 'right', fontWeight: 500 }}>{fmtCurrency(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--color-border-default)' }}>
                  <td colSpan={3} style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Order total</td>
                  <td style={{ padding: '10px 0 10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}>
                    {fmtCurrency(order.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          {/* Actions */}
          {(nextStatus || order.canRefund) && (
            <Card title="Actions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {nextStatus === 'SHIPPED' ? (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', width: '100%' }}>
                    <input
                      type="text"
                      placeholder="Tracking number"
                      value={trackingInput}
                      onChange={e => setTrackingInput(e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      placeholder="Carrier (e.g. FedEx)"
                      value={carrierInput}
                      onChange={e => setCarrierInput(e.target.value)}
                      style={inputStyle}
                    />
                    <button onClick={handleShip} disabled={transition.isPending} style={primaryBtnStyle}>
                      {transition.isPending ? 'Updating…' : 'Mark as Shipped →'}
                    </button>
                  </div>
                ) : nextStatus ? (
                  <button onClick={() => handleTransition(nextStatus)} disabled={transition.isPending} style={primaryBtnStyle}>
                    {transition.isPending ? 'Updating…' : `Mark as ${nextStatus} →`}
                  </button>
                ) : null}
                {order.canRefund && (
                  <button onClick={() => setShowRefundModal(true)} style={{ ...secondaryBtnStyle, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                    Issue Refund
                  </button>
                )}
              </div>
            </Card>
          )}

          {/* Status history */}
          <Card title="Status history">
            <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {order.statusHistory.map((h, i) => (
                <li key={i} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{h.status}</strong>
                  {' — '}{fmtDate(h.at)}
                  {h.note && <span style={{ color: 'var(--color-text-muted)' }}> · {h.note}</span>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Card title="Customer">
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)' }}>{order.customerName}</p>
            {order.customerEmail && <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{order.customerEmail}</p>}
          </Card>

          <Card title="Shipping address">
            {order.shippingAddress ? (
              <address style={{ fontStyle: 'normal', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
                {order.shippingAddress.country}
              </address>
            ) : (
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No address provided.</p>
            )}
          </Card>

          {order.trackingNumber && (
            <Card title="Tracking">
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {order.carrier && <strong>{order.carrier}: </strong>}
                <span style={{ fontFamily: 'monospace' }}>{order.trackingNumber}</span>
              </p>
            </Card>
          )}

          <Card title="Order info">
            <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--font-size-xs)' }}>
              <dt style={{ color: 'var(--color-text-muted)' }}>Placed</dt>
              <dd style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{fmtDate(order.createdAt)}</dd>
              <dt style={{ color: 'var(--color-text-muted)' }}>Payment</dt>
              <dd style={{ margin: 0, color: order.paymentStatus === 'PAID' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {order.paymentStatus}
              </dd>
              {order.notes && (
                <>
                  <dt style={{ color: 'var(--color-text-muted)' }}>Customer note</dt>
                  <dd style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{order.notes}</dd>
                </>
              )}
            </dl>
          </Card>
        </div>
      </div>

      {/* Refund modal */}
      {showRefundModal && (
        <div role="dialog" aria-modal="true" aria-label="Issue refund" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: 'var(--color-surface-1)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', width: 400, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Issue Refund</h2>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              Full refund of <strong>{fmtCurrency(order.total)}</strong> will be issued.
            </p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Reason (optional)</span>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Customer request, defective item, etc."
              />
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRefundModal(false)} style={secondaryBtnStyle}>Cancel</button>
              <button onClick={handleRefund} disabled={refund.isPending} style={{ ...primaryBtnStyle, background: 'var(--color-danger)' }}>
                {refund.isPending ? 'Processing…' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
    <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{title}</h3>
    {children}
  </div>
);

const LoadingSkeleton = () => (
  <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} style={{ height: 80, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)' }} />
    ))}
  </div>
);

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '7px 10px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-1)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  background: 'var(--color-brand-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600,
};
const secondaryBtnStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  background: 'transparent', color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)',
  cursor: 'pointer', fontSize: 'var(--font-size-sm)',
};
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', padding: '4px 0',
};
