import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSellerOrders } from '../../hooks/useSellerOrders';
import { useSellerStore } from '../../stores/sellerStore';
import type { OrderStatus } from '../types';

interface SellerOrdersPageProps {
  shopId: string | null;
}

const STATUS_STYLES: Record<OrderStatus, { color: string; bg: string }> = {
  PENDING: { color: '#f59e0b', bg: '#f59e0b22' },
  CONFIRMED: { color: '#3b82f6', bg: '#3b82f622' },
  SHIPPED: { color: '#8b5cf6', bg: '#8b5cf622' },
  DELIVERED: { color: '#10b981', bg: '#10b98122' },
  CANCELLED: { color: '#ef4444', bg: '#ef444422' },
  REFUNDED: { color: '#6b7280', bg: '#6b728022' },
};

const ALL_STATUSES: (OrderStatus | '')[] = ['', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const fmtCurrency = (v: number) => `$${v.toFixed(2)}`;
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const SellerOrdersPage: React.FC<SellerOrdersPageProps> = ({ shopId }) => {
  const { orderStatusFilter, setOrderStatusFilter } = useSellerStore();
  const { data: orders, isLoading } = useSellerOrders(shopId);
  const [search, setSearch] = useState('');

  const filtered = orders?.filter(o => {
    const matchesStatus = !orderStatusFilter || o.status === orderStatusFilter;
    const matchesSearch = !search || o.id.includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  }) ?? [];

  return (
    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%', overflowY: 'auto' }} role="main" aria-label="Orders">
      <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>Orders</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          aria-label="Search orders"
          placeholder="Search by order ID or customer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={searchInputStyle}
        />
        {/* Status filter pills */}
        <div role="group" aria-label="Filter by status" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              aria-pressed={(orderStatusFilter ?? '') === s}
              onClick={() => setOrderStatusFilter(s || null)}
              style={{
                padding: '4px 12px', border: `1px solid ${(orderStatusFilter ?? '') === s ? 'var(--color-brand-primary)' : 'var(--color-border-default)'}`,
                borderRadius: 'var(--radius-full)', background: (orderStatusFilter ?? '') === s ? 'var(--color-brand-primary)' : 'transparent',
                color: (orderStatusFilter ?? '') === s ? '#fff' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-xs)', cursor: 'pointer',
              }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 60, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-2)', opacity: 0.6 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <p>No orders found.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }} aria-label="Orders table">
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                <th style={thStyle}>Order</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Items</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const s = STATUS_STYLES[order.status];
                return (
                  <tr key={order.id} style={{ borderTop: '1px solid var(--color-border-default)' }}>
                    <td style={tdStyle}>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500 }}>{order.customerName}</div>
                      {order.customerEmail && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{order.customerEmail}</div>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: 'var(--color-text-muted)' }}>{fmtDate(order.createdAt)}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: 'var(--color-text-muted)' }}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {fmtCurrency(order.total)}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, color: s.color, background: s.bg }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <Link to={`../orders/${order.id}`} style={{ color: 'var(--color-brand-primary)', fontSize: 'var(--font-size-xs)', textDecoration: 'none' }}>
                        Details →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' };
const searchInputStyle: React.CSSProperties = {
  padding: '7px 12px', border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)', background: 'var(--color-surface-1)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', minWidth: 240,
};
