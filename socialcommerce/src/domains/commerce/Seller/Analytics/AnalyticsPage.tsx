import React from 'react';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';
import { useSellerStore } from '../../stores/sellerStore';
import { KpiCard } from '../../../../shared/components/charts/KpiCard';
import { LineChartCard } from '../../../../shared/components/charts/LineChartCard';
import { BarChartCard } from '../../../../shared/components/charts/BarChartCard';
import { DonutChartCard } from '../../../../shared/components/charts/DonutChartCard';
import type { AnalyticsRange } from '../types';

interface AnalyticsPageProps {
  shopId: string | null;
}

const RANGE_OPTIONS: { label: string; value: AnalyticsRange }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: '12 months', value: '12m' },
];

const fmtCurrency = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtNum = (v: number) => v.toLocaleString('en-US');
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  SHIPPED: '#8b5cf6',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
  REFUNDED: '#6b7280',
};

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ shopId }) => {
  const analyticsRange = useSellerStore((s) => s.analyticsRange);
  const setAnalyticsRange = useSellerStore((s) => s.setAnalyticsRange);
  const { data, isLoading } = useSalesAnalytics(shopId);

  const ordersByStatus = (data?.ordersByStatus ?? []).map(item => ({
    label: item.status, value: item.count, color: STATUS_COLORS[item.status] ?? '#6b7280',
  }));

  return (
    <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', height: '100%', overflowY: 'auto' }} role="main" aria-label="Analytics">
      {/* Header + range picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--color-text-primary)' }}>Analytics</h1>
        <div role="group" aria-label="Date range" style={{ display: 'flex', gap: 4 }}>
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              aria-pressed={analyticsRange === opt.value}
              onClick={() => setAnalyticsRange(opt.value)}
              style={{
                padding: '4px 14px',
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

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
        <KpiCard label="Revenue" value={isLoading ? '…' : fmtCurrency(data?.kpis?.totalRevenue ?? 0)} change={data?.kpis?.revenueChange} icon="💰" />
        <KpiCard label="Orders" value={isLoading ? '…' : fmtNum(data?.kpis?.totalOrders ?? 0)} change={data?.kpis?.ordersChange} icon="🛍️" />
        <KpiCard label="Units sold" value={isLoading ? '…' : fmtNum(data?.kpis?.totalUnitsSold ?? 0)} icon="📦" />
        <KpiCard label="Avg order value" value={isLoading ? '…' : fmtCurrency(data?.kpis?.avgOrderValue ?? 0)} icon="📊" />
        <KpiCard label="Conversion rate" value={isLoading ? '…' : fmtPct(data?.kpis?.conversionRate ?? 0)} icon="🎯" />
        <KpiCard label="Refund rate" value={isLoading ? '…' : fmtPct(0)} icon="↩️" />
      </div>

      {/* Revenue over time */}
      <LineChartCard
        title="Revenue & orders over time"
        data={(data?.series ?? []).map(d => ({ ...d, orders: (d as { orders?: number }).orders ?? 0 }))}
        series={[
          { key: 'revenue', label: 'Revenue ($)', color: 'var(--color-brand-primary)' },
          { key: 'orders', label: 'Orders', color: '#10b981' },
        ]}
        xKey="date"
        formatY={fmtCurrency}
        height={280}
      />

      {/* Row: Top products + Category revenue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <BarChartCard
          title="Top products by revenue"
          data={(data?.topProducts ?? []).map(p => ({ label: p.title.slice(0, 20), revenue: p.revenue, units: p.unitsSold }))}
          series={[
            { key: 'revenue', label: 'Revenue', color: '#8b5cf6' },
            { key: 'units', label: 'Units sold', color: '#06b6d4' },
          ]}
          xKey="label"
          horizontal
          formatY={fmtCurrency}
        />
        <BarChartCard
          title="Revenue by category"
          data={(data?.revenueByCategory ?? []).map(c => ({ label: c.category, revenue: c.revenue, orders: c.orders }))}
          series={[
            { key: 'revenue', label: 'Revenue', color: '#10b981' },
          ]}
          xKey="label"
          horizontal
          formatY={fmtCurrency}
        />
      </div>

      {/* Row: Orders by status + Revenue trend comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)' }}>
        <DonutChartCard
          title="Orders by status"
          data={ordersByStatus}
          formatValue={fmtNum}
        />
        <LineChartCard
          title="Units sold over time"
          data={data?.revenueByDay ?? []}
          series={[{ key: 'units', label: 'Units', color: '#f59e0b' }]}
          xKey="date"
          formatY={fmtNum}
          height={240}
        />
      </div>

      {/* Top products table */}
      {(data?.topProducts?.length ?? 0) > 0 && (
        <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Top Products Detail
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ color: 'var(--color-text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px 8px 0', fontWeight: 500 }}>Product</th>
                <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'right' }}>Units sold</th>
                <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '8px 0 8px 12px', fontWeight: 500, textAlign: 'right' }}>Avg price</th>
              </tr>
            </thead>
            <tbody>
              {data?.topProducts?.map((p, i) => (
                <tr key={p.productId} style={{ borderTop: '1px solid var(--color-border-default)' }}>
                  <td style={{ padding: '8px 12px 8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 20 }}>#{i + 1}</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>{fmtNum(p.unitsSold)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-text-primary)', fontWeight: 500 }}>{fmtCurrency(p.revenue)}</td>
                  <td style={{ padding: '8px 0 8px 12px', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                    {p.unitsSold > 0 ? fmtCurrency(p.revenue / p.unitsSold) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
