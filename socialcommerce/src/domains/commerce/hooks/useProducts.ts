import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../../shared/api/client';
import type {
  Product,
  Category,
  ProductReview,
  ProductFilters,
  ProductSort,
  ProductAvailability,
  Paginated,
  Money,
} from '../../../shared/types/domain';

// ─── DTOs ────────────────────────────────────────────────────────────────────

interface MoneyDTO { amount: number; currency: string }
interface ProductImageDTO { id: string; url: string; alt: string; order: number }
interface ProductVariantDTO {
  id: string; label: string; sku: string;
  price: MoneyDTO; stock: number; attributes: Record<string, string>;
}
interface CategoryDTO {
  id: string; name: string; slug: string; parent_id?: string;
  children?: CategoryDTO[];
}
interface VendorDTO { id: string; name: string; slug: string; avatar_url: string; rating: number }
interface ProductDTO {
  id: string; vendor_id: string; vendor: VendorDTO;
  title: string; description: string;
  price: MoneyDTO; compare_at_price?: MoneyDTO;
  images: ProductImageDTO[]; category: CategoryDTO;
  tags: string[]; variants: ProductVariantDTO[];
  rating: number; review_count: number;
  availability: string; created_at: string;
}
interface ReviewDTO {
  id: string; product_id: string;
  author_id: string; author_username: string; author_display_name: string; author_avatar_url: string;
  rating: number; title: string; body: string; images: string[];
  helpful_count: number; created_at: string;
}
interface ProductsPageDTO { data: ProductDTO[]; next_cursor: string | null; has_more: boolean }

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapMoney(dto: MoneyDTO): Money { return { amount: dto.amount, currency: dto.currency } }

function mapCategory(dto: CategoryDTO): Category {
  return {
    id: dto.id, name: dto.name, slug: dto.slug, parentId: dto.parent_id,
    children: dto.children?.map(mapCategory),
  };
}

function mapProduct(dto: ProductDTO): Product {
  return {
    id: dto.id, vendorId: dto.vendor_id,
    vendor: { id: dto.vendor.id, name: dto.vendor.name, slug: dto.vendor.slug, avatarUrl: dto.vendor.avatar_url, rating: dto.vendor.rating },
    title: dto.title, description: dto.description,
    price: mapMoney(dto.price),
    compareAtPrice: dto.compare_at_price ? mapMoney(dto.compare_at_price) : undefined,
    images: dto.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, order: i.order })),
    category: mapCategory(dto.category),
    tags: dto.tags,
    variants: dto.variants.map((v) => ({
      id: v.id, label: v.label, sku: v.sku,
      price: mapMoney(v.price), stock: v.stock, attributes: v.attributes,
    })),
    rating: dto.rating, reviewCount: dto.review_count,
    availability: dto.availability as ProductAvailability,
    createdAt: new Date(dto.created_at),
  };
}

function mapReview(dto: ReviewDTO): ProductReview {
  return {
    id: dto.id, productId: dto.product_id,
    author: {
      id: dto.author_id, username: dto.author_username,
      displayName: dto.author_display_name, avatarUrl: dto.author_avatar_url,
      presence: 'offline', lastSeen: new Date(),
    },
    rating: dto.rating, title: dto.title, body: dto.body,
    images: dto.images, helpfulCount: dto.helpful_count,
    createdAt: new Date(dto.created_at),
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.categoryId) params.set('category_id', filters.categoryId);
  if (filters.minPrice != null) params.set('min_price', String(filters.minPrice));
  if (filters.maxPrice != null) params.set('max_price', String(filters.maxPrice));
  if (filters.minRating != null) params.set('min_rating', String(filters.minRating));
  if (filters.vendorId) params.set('vendor_id', filters.vendorId);
  if (filters.sort) params.set('sort', filters.sort);

  return useInfiniteQuery<Paginated<Product>>({
    queryKey: ['products', filters],
    queryFn: async ({ pageParam }) => {
      if (pageParam) params.set('cursor', pageParam as string);
      const dto = await apiGet<ProductsPageDTO>(`/api/products?${params.toString()}`);
      return { items: dto.data.map(mapProduct), nextCursor: dto.next_cursor, hasMore: dto.has_more };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const dto = await apiGet<ProductDTO>(`/api/products/${id}`);
      return mapProduct(dto);
    },
    enabled: !!id,
  });
}

export function useRelatedProducts(productId: string) {
  return useQuery<Product[]>({
    queryKey: ['product', productId, 'related'],
    queryFn: async () => {
      const data = await apiGet<ProductDTO[]>(`/api/products/${productId}/related`);
      return data.map(mapProduct);
    },
    enabled: !!productId,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await apiGet<CategoryDTO[]>('/api/categories');
      return data.map(mapCategory);
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useProductReviews(productId: string) {
  return useQuery<ProductReview[]>({
    queryKey: ['product', productId, 'reviews'],
    queryFn: async () => {
      const data = await apiGet<ReviewDTO[]>(`/api/products/${productId}/reviews`);
      return data.map(mapReview);
    },
    enabled: !!productId,
  });
}

export function useSubmitReview(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rating: number; title: string; body: string }) => {
      const dto = await apiPost<ReviewDTO>(`/api/products/${productId}/reviews`, input);
      return mapReview(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
}

export function useMarkReviewHelpful() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, reviewId }: { productId: string; reviewId: string }) => {
      await apiPost(`/api/products/${productId}/reviews/${reviewId}/helpful`, {});
    },
    onSuccess: (_d, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId, 'reviews'] });
    },
  });
}

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'best_selling', label: 'Best Selling' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];
