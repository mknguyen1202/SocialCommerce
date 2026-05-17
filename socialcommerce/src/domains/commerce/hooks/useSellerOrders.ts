import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../../shared/api/client';
import { useSellerStore } from '../stores/sellerStore';
import type { SellerOrder, OrderStatus } from '../Seller/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(dto: any): SellerOrder {
  return {
    id: dto.id, shopId: dto.shop_id, orderNumber: dto.order_number,
    customerId: dto.customer_id, customerName: dto.customer_name,
    customerEmail: dto.customer_email, customerAvatarUrl: dto.customer_avatar_url,
    items: (dto.items ?? []).map((i: Record<string, unknown>) => ({
      productId: i.product_id, productTitle: i.product_title, variantLabel: i.variant_label,
      sku: i.sku, quantity: i.quantity, unitPrice: i.unit_price, imageUrl: i.image_url,
    })),
    subtotal: dto.subtotal, shippingCost: dto.shipping_cost, total: dto.total, currency: dto.currency,
    status: dto.status as OrderStatus,
    trackingNumber: dto.tracking_number ?? null,
    shippingAddress: {
      line1: dto.shipping_address?.line1 ?? '',
      city: dto.shipping_address?.city ?? '',
      state: dto.shipping_address?.state ?? '',
      postalCode: dto.shipping_address?.postal_code ?? '',
      country: dto.shipping_address?.country ?? '',
    },
    customerNote: dto.customer_note ?? null,
    statusHistory: (dto.status_history ?? []).map((h: Record<string, unknown>) => ({
      status: h.status as OrderStatus, at: new Date(h.at as string), note: h.note as string | undefined,
    })),
    refundEligibleUntil: dto.refund_eligible_until ? new Date(dto.refund_eligible_until) : null,
    refundedAt: dto.refunded_at ? new Date(dto.refunded_at) : null,
    placedAt: new Date(dto.placed_at), updatedAt: new Date(dto.updated_at),
  };
}

export function useSellerOrders(shopId: string | null) {
  const statusFilter = useSellerStore((s) => s.orderStatusFilter);
  return useQuery({
    queryKey: ['seller', 'orders', shopId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiGet<unknown[]>(`/api/seller/shops/${shopId}/orders?${params}`);
      return data.map(mapOrder);
    },
    enabled: !!shopId,
    refetchInterval: 30_000,
  });
}

export function useSellerOrder(shopId: string | null, orderId: string | null) {
  return useQuery({
    queryKey: ['seller', 'order', shopId, orderId],
    queryFn: () => apiGet<unknown>(`/api/seller/shops/${shopId}/orders/${orderId}`).then(mapOrder),
    enabled: !!shopId && !!orderId,
  });
}

export function useTransitionOrderStatus(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status, trackingNumber }: { orderId: string; status: OrderStatus; trackingNumber?: string }) =>
      apiPost(`/api/seller/shops/${shopId}/orders/${orderId}/transition`, { status, tracking_number: trackingNumber }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['seller', 'orders', shopId] });
      qc.invalidateQueries({ queryKey: ['seller', 'order', shopId, vars.orderId] });
    },
  });
}

export function useRefundOrder(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => apiPost(`/api/seller/shops/${shopId}/orders/${orderId}/refund`, {}),
    onSuccess: (_data, orderId) => {
      qc.invalidateQueries({ queryKey: ['seller', 'orders', shopId] });
      qc.invalidateQueries({ queryKey: ['seller', 'order', shopId, orderId] });
    },
  });
}
