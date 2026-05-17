import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../../../shared/api/client';
import type { Shop } from '../Seller/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapShop(dto: any): Shop {
  return {
    id: dto.id, slug: dto.slug, name: dto.name, description: dto.description,
    logoUrl: dto.logo_url ?? dto.logoUrl ?? null,
    bannerUrl: dto.banner_url ?? dto.bannerUrl ?? null,
    rating: dto.rating, reviewCount: dto.review_count ?? dto.reviewCount ?? 0,
    productCount: dto.product_count ?? dto.productCount ?? 0,
    followerCount: dto.follower_count ?? dto.followerCount ?? 0,
    returnPolicy: dto.return_policy ?? dto.returnPolicy ?? '',
    shippingPolicy: dto.shipping_policy ?? dto.shippingPolicy ?? '',
    privacyPolicy: dto.privacy_policy ?? dto.privacyPolicy ?? '',
    notifyNewOrder: dto.notify_new_order ?? dto.notifyNewOrder ?? true,
    notifyNewMessage: dto.notify_new_message ?? dto.notifyNewMessage ?? true,
    notifyLowStock: dto.notify_low_stock ?? dto.notifyLowStock ?? true,
    ownerId: dto.owner_id ?? dto.ownerId,
    createdAt: new Date(dto.created_at ?? dto.createdAt),
  };
}

export function useShopSettings(shopId: string | null) {
  return useQuery({
    queryKey: ['seller', 'shop', shopId],
    queryFn: () => apiGet<unknown>(`/api/seller/shops/${shopId}`).then(mapShop),
    enabled: !!shopId,
  });
}

export function useUpdateShopSettings(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Record<string, unknown>>) =>
      apiPatch(`/api/seller/shops/${shopId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'shop', shopId] });
      qc.invalidateQueries({ queryKey: ['seller', 'shops'] });
    },
  });
}

export function useSlugCheck(shopId: string, slug: string) {
  return useQuery({
    queryKey: ['seller', 'slug-check', shopId, slug],
    queryFn: () => apiGet<{ available: boolean }>(`/api/seller/shops/${shopId}/slug-check?slug=${encodeURIComponent(slug)}`),
    enabled: slug.length >= 3,
  });
}
