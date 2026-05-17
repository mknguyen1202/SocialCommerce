import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../../shared/api/client';
import { useSellerStore } from '../stores/sellerStore';
import type { SellerProduct, ProductStatus } from '../Seller/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(dto: any): SellerProduct {
  return {
    id: dto.id, shopId: dto.shop_id, title: dto.title, description: dto.description,
    category: dto.category, categoryId: dto.category_id, images: dto.images ?? [],
    variants: (dto.variants ?? []).map((v: Record<string, unknown>) => ({
      id: v.id, label: v.label, sku: v.sku, price: v.price, stock: v.stock,
      lowStockThreshold: v.low_stock_threshold ?? 10,
      attributes: v.attributes ?? {},
    })),
    status: dto.status as ProductStatus, tags: dto.tags ?? [], slug: dto.slug ?? '',
    seoTitle: dto.seo_title ?? '', seoDescription: dto.seo_description ?? '',
    salesLast30d: dto.sales_last_30d ?? 0,
    createdAt: new Date(dto.created_at), updatedAt: new Date(dto.updated_at),
  };
}

export function useSellerProducts(shopId: string | null) {
  const search = useSellerStore((s) => s.inventorySearch);
  const statusFilter = useSellerStore((s) => s.inventoryStatusFilter);
  const lowStockOnly = useSellerStore((s) => s.inventoryLowStockOnly);

  return useQuery({
    queryKey: ['seller', 'products', shopId, search, statusFilter, lowStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      if (lowStockOnly) params.set('low_stock', 'true');
      const data = await apiGet<unknown[]>(`/api/seller/shops/${shopId}/products?${params}`);
      return data.map(mapProduct);
    },
    enabled: !!shopId,
  });
}

export function useSellerProduct(shopId: string | null, productId: string | null) {
  return useQuery({
    queryKey: ['seller', 'product', shopId, productId],
    queryFn: () => apiGet<unknown>(`/api/seller/shops/${shopId}/products/${productId}`).then(mapProduct),
    enabled: !!shopId && !!productId,
  });
}

export function useCreateProduct(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SellerProduct> & { status: ProductStatus }) =>
      apiPost(`/api/seller/shops/${shopId}/products`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'products', shopId] }),
  });
}

export function useUpdateProduct(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Partial<SellerProduct> }) =>
      apiPatch(`/api/seller/shops/${shopId}/products/${productId}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['seller', 'products', shopId] });
      qc.invalidateQueries({ queryKey: ['seller', 'product', shopId, vars.productId] });
    },
  });
}

export function useDeleteProduct(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => apiDelete(`/api/seller/shops/${shopId}/products/${productId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'products', shopId] }),
  });
}

export function useBulkImportProducts(shopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (products: unknown[]) => apiPost(`/api/seller/shops/${shopId}/products/bulk`, { products }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller', 'products', shopId] }),
  });
}
