import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '../../../shared/api/client';
import { useSellerStore } from '../stores/sellerStore';
import type { Shop } from '../Seller/types';

interface ShopDTO {
  id: string; slug: string; name: string; description: string;
  logo_url: string | null; banner_url: string | null; rating: number; review_count: number;
  product_count: number; follower_count: number; return_policy: string; shipping_policy: string;
  privacy_policy: string; notify_new_order: boolean; notify_new_message: boolean; notify_low_stock: boolean;
  owner_id: string; created_at: string;
}

function mapShop(dto: ShopDTO): Shop {
  return {
    id: dto.id, slug: dto.slug, name: dto.name, description: dto.description,
    logoUrl: dto.logo_url, bannerUrl: dto.banner_url, rating: dto.rating, reviewCount: dto.review_count,
    productCount: dto.product_count, followerCount: dto.follower_count,
    returnPolicy: dto.return_policy, shippingPolicy: dto.shipping_policy, privacyPolicy: dto.privacy_policy,
    notifyNewOrder: dto.notify_new_order, notifyNewMessage: dto.notify_new_message, notifyLowStock: dto.notify_low_stock,
    ownerId: dto.owner_id, createdAt: new Date(dto.created_at),
  };
}

export function useSellerShops() {
  const setActiveShopId = useSellerStore((s) => s.setActiveShopId);
  const activeShopId = useSellerStore((s) => s.activeShopId);

  const query = useQuery({
    queryKey: ['seller', 'shops'],
    queryFn: async () => {
      const data = await apiGet<ShopDTO[]>('/api/seller/shops');
      return data.map(mapShop);
    },
  });

  // onSuccess was removed in TanStack Query v5 — use useEffect instead.
  // Read activeShopId via getState() (not reactive) to avoid adding it as a
  // dep and causing a cascade when setActiveShopId triggers a re-render.
  useEffect(() => {
    const shops = query.data;
    if (!shops || shops.length === 0) return;
    const currentId = useSellerStore.getState().activeShopId;
    if (!currentId || !shops.find(s => s.id === currentId)) {
      setActiveShopId(shops[0].id);
    }
  // setActiveShopId is a stable Zustand action — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const activeShop = query.data?.find(s => s.id === activeShopId) ?? query.data?.[0] ?? null;
  return { ...query, activeShop };
}

export function useCreateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description: string }) =>
      apiPost<ShopDTO>('/api/seller/shops', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'shops'] }),
  });
}

export function useApplyAsVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost('/api/seller/apply', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'me'] }),
  });
}
