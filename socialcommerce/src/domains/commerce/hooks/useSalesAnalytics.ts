import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/api/client';
import { useSellerStore } from '../stores/sellerStore';
import type { SalesAnalytics, AnalyticsRange } from '../Seller/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnalytics(dto: any): SalesAnalytics {
  return {
    range: (dto.range_days === 7 ? '7d' : dto.range_days === 90 ? '90d' : '30d') as AnalyticsRange,
    kpis: {
      totalRevenue: dto.kpis.total_revenue,
      totalOrders: dto.kpis.total_orders,
      totalUnitsSold: dto.kpis.total_units_sold,
      avgOrderValue: dto.kpis.avg_order_value,
      conversionRate: dto.kpis.conversion_rate,
      revenueChange: dto.kpis.revenue_change,
      ordersChange: dto.kpis.orders_change,
    },
    series: (dto.series ?? []).map((s: Record<string, unknown>) => ({
      date: s.date, revenue: s.revenue, orders: s.orders, unitsSold: s.units_sold,
    })),
    topProducts: (dto.top_products ?? []).map((p: Record<string, unknown>) => ({
      productId: p.product_id, title: p.title, imageUrl: p.image_url,
      revenue: p.revenue, unitsSold: p.units_sold, orders: p.orders,
    })),
    revenueByCategory: (dto.revenue_by_category ?? []).map((c: Record<string, unknown>) => ({
      category: c.category, revenue: c.revenue,
    })),
    ordersByStatus: (dto.orders_by_status ?? []).map((s: Record<string, unknown>) => ({
      status: s.status, count: s.count,
    })),
    conversionFunnel: (dto.conversion_funnel ?? []).map((f: Record<string, unknown>) => ({
      stage: f.stage, count: f.count,
    })),
  };
}

export function useSalesAnalytics(shopId: string | null) {
  const range = useSellerStore((s) => s.analyticsRange);
  const apiRange = range === 'custom' ? '30d' : range;

  return useQuery({
    queryKey: ['seller', 'analytics', shopId, apiRange],
    queryFn: async () => {
      const data = await apiGet<unknown>(`/api/seller/shops/${shopId}/analytics?range=${apiRange}`);
      return mapAnalytics(data);
    },
    enabled: !!shopId,
  });
}
