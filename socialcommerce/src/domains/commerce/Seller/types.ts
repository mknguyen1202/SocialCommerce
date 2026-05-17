/**
 * Seller / My Shop domain types.
 * Server DTOs are kept close to these shapes; hooks map as needed.
 */

// ─── Shop ────────────────────────────────────────────────────────────────────

export interface Shop {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  rating: number;
  reviewCount: number;
  productCount: number;
  followerCount: number;
  returnPolicy: string;
  shippingPolicy: string;
  privacyPolicy: string;
  notifyNewOrder: boolean;
  notifyNewMessage: boolean;
  notifyLowStock: boolean;
  ownerId: string;
  createdAt: Date;
}

// ─── Shop members & permissions ───────────────────────────────────────────────

export type ShopRole = 'owner' | 'manager' | 'staff';

export type ShopPermArea =
  | 'inventory'
  | 'orders'
  | 'analytics'
  | 'conversations'
  | 'ads'
  | 'settings'
  | 'staff';

export type ShopPermissions = Record<ShopPermArea, boolean>;

export interface ShopMember {
  userId: string;
  shopId: string;
  role: ShopRole;
  permissions: ShopPermissions;
  displayName: string;
  email: string;
  avatarUrl: string;
  lastActive: Date | null;
  joinedAt: Date;
}

export interface ShopInvite {
  id: string;
  shopId: string;
  email: string;
  role: ShopRole;
  permissions: ShopPermissions;
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
}

/** Default permissions per role */
export const ROLE_DEFAULT_PERMISSIONS: Record<ShopRole, ShopPermissions> = {
  owner: {
    inventory: true,
    orders: true,
    analytics: true,
    conversations: true,
    ads: true,
    settings: true,
    staff: true,
  },
  manager: {
    inventory: true,
    orders: true,
    analytics: true,
    conversations: true,
    ads: true,
    settings: false,
    staff: false,
  },
  staff: {
    inventory: true,
    orders: true,
    analytics: false,
    conversations: true,
    ads: false,
    settings: false,
    staff: false,
  },
};

export function hasShopPerm(member: ShopMember, area: ShopPermArea): boolean {
  return member.permissions[area] === true;
}

// ─── Products ────────────────────────────────────────────────────────────────

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';

export interface ProductVariant {
  id: string;
  label: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  attributes: Record<string, string>;
}

export interface SellerProduct {
  id: string;
  shopId: string;
  title: string;
  description: string;
  category: string;
  categoryId: string;
  images: string[];
  variants: ProductVariant[];
  status: ProductStatus;
  tags: string[];
  slug: string;
  seoTitle: string;
  seoDescription: string;
  salesLast30d: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface SellerOrderItem {
  productId: string;
  productTitle: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface SellerOrder {
  id: string;
  shopId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAvatarUrl: string;
  items: SellerOrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  status: OrderStatus;
  trackingNumber: string | null;
  shippingAddress: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  customerNote: string | null;
  statusHistory: Array<{ status: OrderStatus; at: Date; note?: string }>;
  refundEligibleUntil: Date | null;
  refundedAt: Date | null;
  placedAt: Date;
  updatedAt: Date;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsRange = '7d' | '30d' | '90d' | 'custom';

export interface SalesPoint {
  date: string; // 'YYYY-MM-DD'
  revenue: number;
  orders: number;
  unitsSold: number;
}

export interface TopProduct {
  productId: string;
  title: string;
  imageUrl: string;
  revenue: number;
  unitsSold: number;
  orders: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
}

export interface SalesAnalytics {
  range: AnalyticsRange;
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    totalUnitsSold: number;
    avgOrderValue: number;
    conversionRate: number;
    revenueChange: number; // % vs previous period
    ordersChange: number;
  };
  series: SalesPoint[];
  topProducts: TopProduct[];
  revenueByCategory: CategoryRevenue[];
  ordersByStatus: Array<{ status: OrderStatus; count: number }>;
  conversionFunnel: { stage: string; count: number }[];
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'BUDGET_EXHAUSTED';

export interface CampaignMetricsPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface Campaign {
  id: string;
  shopId: string;
  name: string;
  status: CampaignStatus;
  productIds: string[];
  dailyBudget: number;
  totalBudget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  audienceTags: string[];
  startDate: string;
  endDate: string | null;
  series: CampaignMetricsPoint[];
  createdAt: Date;
}

// ─── Shop Conversations ───────────────────────────────────────────────────────

export type ShopConvStatus = 'OPEN' | 'PENDING' | 'CLOSED';

export interface ShopConversation {
  id: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl: string;
  customerEmail: string;
  subject: string;
  status: ShopConvStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  linkedOrderId: string | null;
  linkedOrderNumber: string | null;
  tags: string[];
  unreadByStaff: number;
  lastMessage: {
    content: string;
    senderIsCustomer: boolean;
    at: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string;
  senderIsCustomer: boolean;
  content: string;
  isInternalNote: boolean;
  createdAt: Date;
}

export interface CannedReply {
  id: string;
  shopId: string;
  title: string;
  body: string;
}
