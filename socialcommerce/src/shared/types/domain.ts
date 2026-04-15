/**
 * Domain Models — the canonical app-level shape used in business logic.
 * Mapped from DTOs; used by hooks, stores, and component props.
 */

export type Presence = 'online' | 'offline' | 'idle' | 'dnd';

export interface DomainUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  presence: Presence;
  lastSeen: Date;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface DomainMessage {
  id: string;
  conversationId: string;
  sender: DomainUser;
  content: string;
  attachments: DomainAttachment[];
  reactions: DomainReaction[];
  replyTo?: Pick<DomainMessage, 'id' | 'content' | 'sender'>;
  editedAt?: Date;
  createdAt: Date;
  status: MessageStatus;
}

export interface DomainAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface DomainReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'room';
  name?: string;
  avatarUrl?: string;
  participants: DomainUser[];
  lastMessage?: Pick<DomainMessage, 'id' | 'content' | 'sender' | 'createdAt'>;
  unreadCount: number;
  pinnedMessages: DomainMessage[];
  createdAt: Date;
}

export interface CallParticipant {
  user: DomainUser;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  joinedAt: Date;
}

export interface CallSession {
  id: string;
  conversationId: string;
  type: 'voice' | 'video';
  participants: CallParticipant[];
  status: 'ringing' | 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Social Domain ────────────────────────────────────────────────────────────

export type PostType = 'text' | 'image' | 'video' | 'link' | 'poll';
export type VoteDirection = 'up' | 'down';
export type FeedSort = 'hot' | 'new' | 'top';
export type GroupVisibility = 'public' | 'private' | 'restricted';
export type GroupRole = 'owner' | 'moderator' | 'member';

export interface GroupSummary {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
  percentage: number;
}

export interface Poll {
  id: string;
  options: PollOption[];
  totalVotes: number;
  endsAt?: Date;
  userVotedOptionId?: string;
}

export interface Post {
  id: string;
  author: DomainUser;
  group?: GroupSummary;
  type: PostType;
  title: string;
  body: string;
  mediaUrls: string[];
  linkUrl?: string;
  poll?: Poll;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote?: VoteDirection | null;
  commentCount: number;
  shareCount: number;
  isSaved: boolean;
  createdAt: Date;
  editedAt?: Date;
}

export interface Comment {
  id: string;
  postId: string;
  parentId?: string;
  author: DomainUser;
  body: string;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote?: VoteDirection | null;
  replies: Comment[];
  replyCount: number;
  createdAt: Date;
  editedAt?: Date;
  isCollapsed: boolean;
}

export interface GroupRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
  visibility: GroupVisibility;
  memberCount: number;
  rules: GroupRule[];
  userRole?: GroupRole | null;
  createdAt: Date;
}

// ─── Streaming Domain ─────────────────────────────────────────────────────────

export type TheaterStatus = 'created' | 'scheduled' | 'live' | 'paused' | 'ended';
export type TheaterVisibility = 'public' | 'private' | 'friends';
export type ContentSourceType = 'screen_share' | 'media_upload' | 'external_url';
export type TheaterParticipantRole = 'host' | 'moderator' | 'viewer';

export interface ContentSource {
  type: ContentSourceType;
  url?: string;
  mediaId?: string;
}

export interface Theater {
  id: string;
  host: DomainUser;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: TheaterVisibility;
  status: TheaterStatus;
  contentSource: ContentSource;
  viewerCount: number;
  maxViewers?: number;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

export interface TheaterParticipant {
  user: DomainUser;
  role: TheaterParticipantRole;
  joinedAt: Date;
  isChatMuted: boolean;
}

export interface Emote {
  code: string;
  imageUrl: string;
  category: 'global' | 'theater';
}

export interface TheaterChatMessage {
  id: string;
  theaterId: string;
  sender: DomainUser;
  content: string;
  emotes: Emote[];
  createdAt: Date;
  isDeleted: boolean;
}

export interface PlaybackState {
  position: number;
  isPlaying: boolean;
  updatedAt: Date;
}

// ─── E-Commerce Domain ────────────────────────────────────────────────────────

export type ProductAvailability = 'in_stock' | 'low_stock' | 'out_of_stock';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'review' | 'confirmation';

export interface Money {
  amount: number;
  currency: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  order: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  sku: string;
  price: Money;
  stock: number;
  attributes: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  children?: Category[];
}

export interface VendorSummary {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
  rating: number;
}

export interface Product {
  id: string;
  vendorId: string;
  vendor: VendorSummary;
  title: string;
  description: string;
  price: Money;
  compareAtPrice?: Money;
  images: ProductImage[];
  category: Category;
  tags: string[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  availability: ProductAvailability;
  createdAt: Date;
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: Money;
  itemCount: number;
  couponCode?: string;
  discount?: Money;
}

export interface Address {
  id?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PaymentMethodSummary {
  id: string;
  type: 'card' | 'wallet';
  label: string;
  last4?: string;
}

export interface OrderItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface Order {
  id: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: PaymentMethodSummary;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  total: Money;
  status: OrderStatus;
  placedAt: Date;
  updatedAt: Date;
}

export interface ProductReview {
  id: string;
  productId: string;
  author: DomainUser;
  rating: number;
  title: string;
  body: string;
  images: string[];
  helpfulCount: number;
  createdAt: Date;
}

export interface ProductFilters {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  vendorId?: string;
  sort?: ProductSort;
}

export type ProductSort = 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'best_selling';

// ─── Phase 7 — Cross-Domain / Integration Types ──────────────────────────────

export type NotificationDomain = 'communication' | 'social' | 'streaming' | 'commerce';

export type NotificationType =
  | 'new_message'    // communication
  | 'missed_call'
  | 'friend_request'
  | 'reply'          // social
  | 'reaction'
  | 'group_invite'
  | 'mention'
  | 'theater_invite' // streaming
  | 'theater_live'
  | 'order_update'   // commerce
  | 'sale_alert'
  | 'new_review';

export interface AppNotification {
  id: string;
  domain: NotificationDomain;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string;
  actorId?: string;
  actorName?: string;
  actorAvatarUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

export type ActivityEventType =
  | 'user_posted'
  | 'user_is_live'
  | 'shop_sale'
  | 'friend_joined'
  | 'theater_started';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  actor: DomainUser;
  title: string;
  body?: string;
  linkUrl: string;
  domain: NotificationDomain;
  createdAt: Date;
}

export interface SearchResultUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  presence: Presence;
}

export interface SearchResultPost {
  id: string;
  title: string;
  authorName: string;
  groupName?: string;
  score: number;
}

export interface SearchResultTheater {
  id: string;
  title: string;
  hostName: string;
  status: 'live' | 'scheduled' | 'ended';
  viewerCount: number;
}

export interface SearchResultProduct {
  id: string;
  title: string;
  vendorName: string;
  price: Money;
  thumbnailUrl?: string;
}

export interface UnifiedSearchResults {
  query: string;
  users: SearchResultUser[];
  posts: SearchResultPost[];
  theaters: SearchResultTheater[];
  products: SearchResultProduct[];
}
