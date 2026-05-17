import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';
import { useSellerProducts } from '../../hooks/useSellerProducts';
import { useSellerOrders } from '../../hooks/useSellerOrders';
import { useShopConversations } from '../../hooks/useShopConversations';
import { useSellerStore } from '../../stores/sellerStore';
import { KpiCard } from '../../../../shared/components/charts/KpiCard';
import { LineChartCard } from '../../../../shared/components/charts/LineChartCard';
import { DonutChartCard } from '../../../../shared/components/charts/DonutChartCard';
import { BarChartCard } from '../../../../shared/components/charts/BarChartCard';
import type { AnalyticsRange } from '../types';

interface DashboardPageProps {
  shopId: string | null;
}

const fmtCurrency = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtNum = (v: number) => v.toLocaleString('en-US');

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  SHIPPED: '#8b5cf6',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
  REFUNDED: '#6b7280',
};

const RANGE_OPTIONS: { label: string; value: AnalyticsRange }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: '12 months', value: '12m' },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({ shopId }) => {
  const analyticsRange = useSellerStore((s) => s.analyticsRange);
  const setAnalyticsRange = useSellerStore((s) => s.setAnalyticsRange);
  const { data: analytics, isLoading: loadingAnalytics } = useSalesAnalytics(shopId);
  const { data: products } = useSellerProducts(shopId);
  const { data: orders } = useSellerOrders(shopId);
  const { data: conversations } = useShopConversations(shopId);

  // Low-stock products
  const lowStockProducts = products?.filter(p =>
    p.variants.some(v => v.stock > 0 && v.stock <= v.lowStockThreshold)
  ) ?? [];

  // Recent 5 orders
  const recentOrders = orders?.slice(0, 5) ?? [];

  // Unread conversations
  const openConvs = conversations?.filter(c => c.status === 'OPEN' && c.unreadByStaff > 0) ?? [];

  // Order status donut data
  const ordersByStatus = Object.entries(
    (orders ?? []).reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] ?? '#6b7280' }));

  const pageStyle: React.CSSProperties = {
    padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
    overflowY: 'auto', height: '100%',
  };

  if (!shopId) {
    return (
      <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        <p>Select or create a shop to get started.</p>
      </div>
    );
  }

  return (
    <div style={pageStyle} role="main" aria-label="Seller dashboard">
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>Dashboard</h1>
        <div role="group" aria-label="Date range" style={{ display: 'flex', gap: 4 }}>
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              aria-pressed={analyticsRange === opt.value}
              onClick={() => setAnalyticsRange(opt.value)}
              style={{
                padding: '4px 12px',
                border: `1px solid ${analyticsRange === opt.value ? 'var(--color-brand-primary)' : 'var(--color-border-default)'}`,
                borderRadius: 'var(--radius-full)',
                background: analyticsRange === opt.value ? 'var(--color-brand-primary)' : 'transparent',
                color: analyticsRange === opt.value ? '#fff' : 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-xs)', cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
        <KpiCard
          label="Revenue"
          value={loadingAnalytics ? '…' : fmtCurrency(analytics?.kpis?.totalRevenue ?? 0)}
          change={analytics?.kpis?.revenueChange}
          icon="💰"
        />
        <KpiCard
          label="Orders"
          value={loadingAnalytics ? '…' : fmtNum(analytics?.kpis?.totalOrders ?? 0)}
          change={analytics?.kpis?.ordersChange}
          icon="🛍️"
        />
        <KpiCard
          label="Units sold"
          value={loadingAnalytics ? '…' : fmtNum(analytics?.kpis?.totalUnitsSold ?? 0)}
          icon="📦"
        />
        <KpiCard
          label="Avg order value"
          value={loadingAnalytics ? '…' : fmtCurrency(analytics?.kpis?.avgOrderValue ?? 0)}
          icon="📊"
        />
        <KpiCard
          label="Conversion rate"
          value={loadingAnalytics ? '…' : `${((analytics?.kpis?.conversionRate ?? 0) * 100).toFixed(1)}%`}
          icon="🎯"
        />
        <KpiCard
          label="Low-stock items"
          value={String(lowStockProducts.length)}
          icon="⚠️"
          style={{ borderColor: lowStockProducts.length > 0 ? 'var(--color-warning)' : undefined }}
        />
      </div>

      {/* Charts row 1: Revenue over time + Orders by status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)', minWidth: 0 }}>
        <LineChartCard
          title="Revenue over time"
          data={analytics?.series ?? []}
          series={[{ key: 'revenue', label: 'Revenue', color: 'var(--color-brand-primary)' }]}
          xKey="date"
          formatY={fmtCurrency}
        />
        <DonutChartCard
          title="Orders by status"
          data={ordersByStatus}
          formatValue={fmtNum}
        />
      </div>

      {/* Charts row 2: Top products bar chart + Category revenue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', minWidth: 0 }}>
        <BarChartCard
          title="Top products by revenue"
          data={(analytics?.topProducts ?? []).map(p => ({ label: p.title.slice(0, 18), revenue: p.revenue }))}
          series={[{ key: 'revenue', label: 'Revenue', color: '#8b5cf6' }]}
          xKey="label"
          horizontal
          formatY={fmtCurrency}
        />
        <BarChartCard
          title="Revenue by category"
          data={(analytics?.revenueByCategory ?? []).map(c => ({ label: c.category, revenue: c.revenue }))}
          series={[{ key: 'revenue', label: 'Revenue', color: '#10b981' }]}
          xKey="label"
          horizontal
          formatY={fmtCurrency}
        />
      </div>

      {/* Bottom widgets: Recent orders + Low-stock alerts + Open conversations */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)', minWidth: 0 }}>
        {/* Recent orders */}
        <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>Recent Orders</h3>
            <Link to="../orders" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-brand-primary)' }}>View all →</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No orders yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px 4px 0', fontWeight: 500 as React.CSSProperties['fontWeight'] }}>Order</th>
                  <th style={{ padding: '4px 8px', fontWeight: 500 as React.CSSProperties['fontWeight'] }}>Status</th>
                  <th style={{ padding: '4px 0 4px 8px', fontWeight: 500 as React.CSSProperties['fontWeight'], textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} style={{ borderTop: '1px solid var(--color-border-default)' }}>
                    <td style={{ padding: '6px 8px 6px 0' }}>
                      <Link to={`../orders/${order.id}`} style={{ color: 'var(--color-brand-primary)', textDecoration: 'none' }}>
                        #{order.id.slice(-6).toUpperCase()}
                      </Link>
                      <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{order.customerName}</div>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        fontSize: 10, fontWeight: 600,
                        background: STATUS_COLORS[order.status] + '22',
                        color: STATUS_COLORS[order.status],
                      }}>{order.status}</span>
                    </td>
                    <td style={{ padding: '6px 0 6px 8px', textAlign: 'right', color: 'var(--color-text-primary)', fontWeight: 500 as React.CSSProperties['fontWeight'] }}>
                      {fmtCurrency(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column: Low-stock + Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Low-stock alerts */}
          <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>⚠️ Low Stock</h3>
              <Link to="../inventory" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-brand-primary)' }}>Manage →</Link>
            </div>
            {lowStockProducts.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>All items are well-stocked.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lowStockProducts.slice(0, 4).map(p => {
                  const lowVariant = p.variants.find(v => v.stock > 0 && v.stock <= v.lowStockThreshold)!;
                  return (
                    <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', gap: 8 }}>
                      <span style={{ color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                      <span style={{ color: 'var(--color-warning)', fontWeight: 600, flexShrink: 0 }}>{lowVariant.stock} left</span>
                    </li>
                  );
                })}
                {lowStockProducts.length > 4 && (
                  <li style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>+{lowStockProducts.length - 4} more</li>
                )}
              </ul>
            )}
          </div>

          {/* Open conversations */}
          <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600 as React.CSSProperties['fontWeight'], color: 'var(--color-text-primary)' }}>💬 Inbox</h3>
              <Link to="../inbox" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-brand-primary)' }}>Open →</Link>
            </div>
            {openConvs.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>No unread messages.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openConvs.slice(0, 4).map(c => (
                  <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', gap: 8 }}>
                    <span style={{ color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.customerName}</span>
                    <span style={{
                      minWidth: 18, height: 18, borderRadius: 9, background: 'var(--color-danger)',
                      color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{c.unreadByStaff}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
