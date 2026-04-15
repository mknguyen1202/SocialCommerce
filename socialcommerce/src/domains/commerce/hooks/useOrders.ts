import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '../../../shared/api/client';
import type {
  Order,
  OrderItem,
  OrderStatus,
  Address,
  Money,
  Product,
  ProductVariant,
} from '../../../shared/types/domain';

// ─── DTOs ────────────────────────────────────────────────────────────────────

interface MoneyDTO { amount: number; currency: string }
interface OrderItemDTO {
  product_id: string; variant_id: string;
  product_title: string; product_image_url: string;
  variant_label: string; variant_sku: string;
  quantity: number; unit_price: MoneyDTO; line_total: MoneyDTO;
}
interface AddressDTO {
  id?: string; full_name: string; line1: string; line2?: string;
  city: string; state: string; postal_code: string; country: string;
}
interface PaymentDTO { id: string; type: string; label: string; last4?: string }
interface OrderDTO {
  id: string;
  items: OrderItemDTO[];
  shipping_address: AddressDTO;
  payment_method: PaymentDTO;
  subtotal: MoneyDTO; shipping: MoneyDTO; tax: MoneyDTO; total: MoneyDTO;
  status: string;
  placed_at: string; updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapMoney(dto: MoneyDTO): Money { return { amount: dto.amount, currency: dto.currency }; }

function mapAddress(dto: AddressDTO): Address {
  return {
    id: dto.id,
    fullName: dto.full_name,
    line1: dto.line1,
    line2: dto.line2,
    city: dto.city,
    state: dto.state,
    postalCode: dto.postal_code,
    country: dto.country,
  };
}

function mapOrderItem(dto: OrderItemDTO): OrderItem {
  // Minimal Product/Variant shells sufficient for order display
  const product: Product = {
    id: dto.product_id,
    vendorId: '',
    vendor: { id: '', name: '', slug: '', avatarUrl: '', rating: 0 },
    title: dto.product_title,
    description: '',
    price: mapMoney(dto.unit_price),
    images: [{ id: '0', url: dto.product_image_url, alt: dto.product_title, order: 0 }],
    category: { id: '', name: '', slug: '' },
    tags: [],
    variants: [],
    rating: 0,
    reviewCount: 0,
    availability: 'in_stock',
    createdAt: new Date(0),
  };
  const variant: ProductVariant = {
    id: dto.variant_id,
    label: dto.variant_label,
    sku: dto.variant_sku,
    price: mapMoney(dto.unit_price),
    stock: 0,
    attributes: {},
  };
  return {
    product,
    variant,
    quantity: dto.quantity,
    unitPrice: mapMoney(dto.unit_price),
    lineTotal: mapMoney(dto.line_total),
  };
}

function mapOrder(dto: OrderDTO): Order {
  return {
    id: dto.id,
    items: dto.items.map(mapOrderItem),
    shippingAddress: mapAddress(dto.shipping_address),
    paymentMethod: {
      id: dto.payment_method.id,
      type: dto.payment_method.type as 'card' | 'wallet',
      label: dto.payment_method.label,
      last4: dto.payment_method.last4,
    },
    subtotal: mapMoney(dto.subtotal),
    shipping: mapMoney(dto.shipping),
    tax: mapMoney(dto.tax),
    total: mapMoney(dto.total),
    status: dto.status as OrderStatus,
    placedAt: new Date(dto.placed_at),
    updatedAt: new Date(dto.updated_at),
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const data = await apiGet<OrderDTO[]>('/api/orders');
      return data.map(mapOrder);
    },
  });
}

export function useOrder(id: string) {
  return useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const dto = await apiGet<OrderDTO>(`/api/orders/${id}`);
      return mapOrder(dto);
    },
    enabled: !!id,
  });
}

interface PlaceOrderInput {
  items: { productId: string; variantId: string; quantity: number }[];
  shippingAddress: Address;
  paymentMethodId: string;
  couponCode?: string;
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlaceOrderInput): Promise<Order> => {
      const dto = await apiPost<OrderDTO>('/api/orders', {
        items: input.items.map((i) => ({
          product_id: i.productId,
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
        shipping_address: {
          full_name: input.shippingAddress.fullName,
          line1: input.shippingAddress.line1,
          line2: input.shippingAddress.line2,
          city: input.shippingAddress.city,
          state: input.shippingAddress.state,
          postal_code: input.shippingAddress.postalCode,
          country: input.shippingAddress.country,
        },
        payment_method_id: input.paymentMethodId,
        coupon_code: input.couponCode,
      });
      return mapOrder(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string): Promise<Order> => {
      const dto = await apiPatch<OrderDTO>(`/api/orders/${orderId}/cancel`, {});
      return mapOrder(dto);
    },
    onSuccess: (_d, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'var(--color-warning)',
  confirmed: 'var(--color-brand-primary)',
  shipped: 'var(--color-info, #4ea7ff)',
  delivered: 'var(--color-success)',
  cancelled: 'var(--color-text-muted)',
  refunded: 'var(--color-danger)',
};
