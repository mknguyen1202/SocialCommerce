# Unified ReactTS Super App — Development Strategy (Phased + AI Prompts)

## Overview

This document defines a **phased frontend development strategy** for a
React + TypeScript single-page web application spanning four core domains:

| Domain | Analogy | Core Purpose |
|---|---|---|
| **Communication** | Discord | Chat, Calls, Presence |
| **Social** | Reddit | Feeds, Walls, Groups, Reactions |
| **Streaming** | Twitch / Netflix Party | Theaters, Co-watching, Live Chat |
| **E-Commerce** | Amazon | Shops, Inventory, Payments |

The app is designed as a **super-app**: a single SPA shell that hosts
multiple domain micro-frontends behind shared authentication,
navigation, notifications, and profile infrastructure.

This document serves as both **AI context** and an **engineering roadmap**.

---

## Domain Map

```
┌───────────────────────────────────────────────────────────────┐
│                        App Shell                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  Comms   │  │  Social  │  │ Streaming │  │  E-Commerce  │  │
│  │  (Chat/  │  │  (Feed/  │  │ (Theater/ │  │  (Shop/Cart/ │  │
│  │   Call)  │  │  Groups) │  │  Co-view) │  │   Checkout)  │  │
│  └──────────┘  └──────────┘  └───────────┘  └──────────────┘  │
│                                                               │
│  Shared: Auth · Navigation · Profile · Notifications · RT     │
└───────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Sign-In → Communication Domain (Home)

1. User visits the app (unauthenticated) → **Login Page**.
2. User signs in (OAuth / credentials).
3. On successful `SIGN_IN`, the user is redirected to the
   **Communication Domain** — the default home screen that resembles
   a Discord-style layout:
   - Sidebar with DM list & Room list.
   - Domain navigation rail (Communication · Social · Streaming · Shop).
   - Profile avatar / settings.
   - Notification bell.
4. The Communication Domain is the **default landing domain** after
   every login.

### Sign-Out

1. User triggers `SIGN_OUT` from any domain.
2. Session is cleared (tokens revoked, local state purged).
3. User is redirected back to the **Login Page**.

### Auth State

| State | Behavior |
|---|---|
| `UNAUTHENTICATED` | Redirect to Login page; block all domain routes |
| `AUTHENTICATED` | Redirect to Communication Domain (home) |
| `SESSION_EXPIRED` | Silent refresh attempt → fallback to Login |

---

## Cross-Domain Navigation

Every domain provides a **persistent navigation mechanism** (e.g., a
sidebar rail or top nav) that allows the user to switch between:

- 💬 Communication
- 📰 Social
- 🎬 Streaming
- 🛒 E-Commerce

Navigation is **client-side routed** — no full-page reloads. Domain
state is preserved when switching (e.g., chat scroll position is
maintained when the user visits Social and returns).

---

## Cross-Domain Shared Infrastructure

### Profile Mechanism

- Accessible from any domain via avatar click.
- Displays: username, avatar, bio, account settings.
- Profile data is **global** — the same identity across all domains.
- Other users' profiles show domain-relevant info:
  - Communication: mutual friends, DM button.
  - Social: post history, groups.
  - Streaming: hosted theaters.
  - E-Commerce: shop link (if vendor).

### Notification Mechanism

- Unified notification center accessible from any domain.
- Notification types per domain:
  - **Communication**: new message, missed call, friend request.
  - **Social**: reply, reaction, group invite, mention.
  - **Streaming**: theater invite, theater going live.
  - **E-Commerce**: order update, sale alert, new review.
- Real-time delivery via WebSocket / SSE.
- Notification badge count is always visible in the nav rail.

### Real-Time Layer

- Shared WebSocket connection (or multiplexed channels).
- Used by: chat messages, presence, typing indicators, call signaling,
  live theater chat, order status updates, notification push.

---

## Phase 0 — Foundations

### Goals

- Establish app shell, design system, and core infrastructure.

### Deliverables

| Deliverable | Details |
|---|---|
| **App Shell** | Root layout with domain navigation rail, top bar (profile + notifications), and routed `<Outlet>` for domain content. |
| **Design System** | Token-based theme (colors, spacing, typography). Shared component library: `Button`, `Avatar`, `Badge`, `Modal`, `Tooltip`, `Dropdown`, `Skeleton`. |
| **Routing** | File-based or config-based routes. Auth guard (redirect unauthenticated users). Lazy-loaded domain bundles. |
| **Auth Flow** | Login page → OAuth / credentials → JWT access + refresh tokens. `AuthContext` providing `user`, `signIn()`, `signOut()`, `isAuthenticated`. Protected route wrapper. |
| **State Strategy** | **Server cache**: React Query / TanStack Query for API data (feeds, products, messages history). **UI state**: Zustand or Context for local UI (modals, sidebar open, theme). |
| **Real-Time Scaffold** | Singleton WebSocket manager with channel multiplexing. Hooks: `useSocket()`, `usePresence()`, `useChannel(topic)`. Reconnection + exponential backoff. |
| **Type System Layering** | `DTO` → raw API shape. `Domain Model` → app logic shape. `View Model` → UI-specific shape. Mapper utilities between layers. |

### Folder Structure (Proposed)

```
src/
├── app/                    # App shell, root layout, providers
│   ├── layout/
│   ├── navigation/
│   └── providers/
├── domains/
│   ├── communication/      # Chat + Call
│   ├── social/             # Feed + Groups
│   ├── streaming/          # Theaters
│   └── commerce/           # Shop + Checkout
├── shared/
│   ├── components/         # Design system components
│   ├── hooks/              # Shared hooks
│   ├── lib/                # Utilities, mappers, constants
│   ├── types/              # Shared types (DTO, Domain, View)
│   ├── api/                # API client, interceptors
│   └── realtime/           # WebSocket manager, hooks
├── assets/
└── styles/
```

---

## Phase 1 — Communication Domain

### Description

The Communication Domain is the **home screen** of the app. It provides
a Discord-style interface for real-time messaging and calling.

### Features

#### 1.1 Chat — Direct Messages (DM)

- User can send **individual (1:1) messages** to friends/connections.
- Message types: text, emoji, attachments (images, video, files).
- Message actions: edit, delete, react (emoji reactions).
- Messages are **virtualized** (windowed rendering for performance).
- Optimistic UI: messages appear instantly, reconcile with server.
- Read receipts / delivery status indicators.
- Message search within conversation.

#### 1.2 Chat — Rooms (Group Chat)

- User can create or join **Rooms** (group conversations).
- Room features:
  - Name, avatar/icon, description.
  - Member list with roles (owner, admin, member).
  - Invite mechanism (link or direct invite).
  - Pinned messages.
- Same messaging capabilities as DM (text, attachments, reactions,
  edit/delete).
- Room discovery (browse public rooms) — optional.

#### 1.3 Composer

- Rich text input with:
  - Emoji picker.
  - File/media attachment (drag-and-drop + file picker).
  - Mention (`@user`) autocomplete.
  - Reply-to / quote mechanism.
- Character limit indicator (if applicable).
- Send on Enter, Shift+Enter for newline.

#### 1.4 Presence & Typing

- Online/offline/idle/DND status for each user.
- Typing indicators: "User is typing…" in real time.
- Last seen timestamp.

#### 1.5 Real-Time Calls

- **Voice call**: 1:1 or group (Room-based).
- **Video call**: 1:1 or group with camera toggle.
- **Screen sharing**: share entire screen or specific window/tab.
- Call controls: mute, deafen, camera on/off, screen share, hang up.
- Call UI: floating/minimizable call window so user can navigate
  elsewhere without ending the call.
- Call signaling via WebSocket; media via WebRTC.

#### 1.6 Navigation from Communication

- Sidebar rail or nav icons to switch to Social, Streaming, or
  E-Commerce domains.
- Active domain is highlighted.
- Unread counts / notification badges on other domain icons.

### Data Models (Communication)

```typescript
// Domain Models (not DTOs)
interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  presence: 'online' | 'offline' | 'idle' | 'dnd';
  lastSeen: Date;
}

interface Message {
  id: string;
  conversationId: string;
  sender: User;
  content: string;
  attachments: Attachment[];
  reactions: Reaction[];
  replyTo?: Message;
  editedAt?: Date;
  createdAt: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

interface Reaction {
  emoji: string;
  users: User[];
  count: number;
}

interface Conversation {
  id: string;
  type: 'dm' | 'room';
  name?: string;            // Rooms have names; DMs derive from participants
  avatarUrl?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  pinnedMessages: Message[];
  createdAt: Date;
}

interface CallSession {
  id: string;
  type: 'voice' | 'video';
  participants: CallParticipant[];
  status: 'ringing' | 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
}

interface CallParticipant {
  user: User;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  joinedAt: Date;
}
```

### Component Hierarchy (Communication)

```
CommunicationDomain/
├── CommunicationLayout           # Sidebar + main content area
├── Sidebar/
│   ├── ConversationList          # DMs + Rooms list
│   ├── ConversationListItem      # Single conversation preview
│   ├── RoomCreateModal           # Create new room
│   └── UserSearchPanel           # Start new DM
├── Chat/
│   ├── ChatView                  # Main chat area for a conversation
│   ├── MessageList               # Virtualized message list
│   ├── MessageItem               # Single message bubble
│   ├── MessageActions            # Edit / Delete / React menu
│   ├── ReactionBar               # Emoji reactions on a message
│   ├── Composer                  # Rich input area
│   ├── AttachmentPreview         # Preview before send
│   ├── TypingIndicator           # "X is typing..."
│   └── PinnedMessages            # Pinned messages panel
├── Call/
│   ├── CallControls              # Mute / Camera / ScreenShare / Hangup
│   ├── CallParticipantGrid       # Video tiles / audio avatars
│   ├── CallFloatingWindow        # Minimized call overlay
│   └── IncomingCallModal         # Ring UI
└── shared/
    ├── PresenceDot               # Online/offline indicator
    └── UserAvatar                # Avatar + presence badge
```

### Real-Time Events (Communication)

| Event | Direction | Payload |
|---|---|---|
| `message:new` | Server → Client | `Message` |
| `message:edit` | Server → Client | `{ messageId, content, editedAt }` |
| `message:delete` | Server → Client | `{ messageId }` |
| `message:reaction` | Server → Client | `{ messageId, emoji, userId, action }` |
| `typing:start` | Client → Server | `{ conversationId, userId }` |
| `typing:stop` | Client → Server | `{ conversationId, userId }` |
| `presence:update` | Server → Client | `{ userId, presence }` |
| `call:incoming` | Server → Client | `CallSession` |
| `call:joined` | Server → Client | `CallParticipant` |
| `call:left` | Server → Client | `{ userId }` |
| `call:signal` | Peer → Peer | WebRTC SDP / ICE candidates |

### Edge Cases

- Message send failure → retry button + error state.
- Attachment upload failure → show error, allow re-upload.
- WebSocket disconnect → reconnect with exponential backoff, show
  "Reconnecting…" banner.
- Conflicting edits → last-write-wins with server timestamp.
- Call participant drops → auto-reconnect attempt, show "Reconnecting"
  status on their tile.
- Large room (100+ members) → paginated member list, debounced typing
  indicators.

---

## Phase 2 — Social Domain

### Description

The Social Domain is a Reddit-like experience where users can browse
feeds, post content, comment, react, share, and participate in
community groups.

### Features

#### 2.1 Feed

- **Home Feed**: aggregated posts from followed users and joined groups.
- **Explore Feed**: trending / recommended posts (algorithm or
  chronological toggle).
- **Infinite scroll** with virtualized rendering.
- Feed filters: Hot / New / Top (day/week/month/all).
- Pull-to-refresh (mobile) or "New posts available" banner (desktop).

#### 2.2 User Wall

- Dedicated page showing **all posts by a specific user**.
- Accessible from profile or clicking a username anywhere.
- Same infinite scroll and rendering as Home Feed.
- Shows user bio, follower/following counts, joined date.

#### 2.3 Posts

- Post types: text, image, video, link, poll.
- Post actions:
  - **React**: upvote / downvote (Reddit-style) or emoji reactions.
  - **Comment**: threaded comment tree (nested replies).
  - **Share**: repost to own wall or copy link.
  - **Save/Bookmark**.
  - **Report**.
- Post author can **edit** or **delete** their post.
- Rich text editor for post creation (Markdown support optional).

#### 2.4 Comments

- **Threaded / nested** comment tree (like Reddit).
- Collapsible threads.
- Comment actions: react, reply, edit, delete, report.
- Sort by: Best / New / Top / Controversial.
- Lazy-load deep threads ("Load more replies").

#### 2.5 Groups (Subreddit-like)

- User can **create a Group** with:
  - Name, description, avatar/banner, rules.
  - Visibility: public / private / restricted.
- Group roles: owner, moderator, member.
- Moderation tools:
  - Remove posts/comments.
  - Ban/mute users.
  - Approve/reject posts (if restricted).
  - Manage rules and auto-moderation.
- Group feed: posts scoped to the group.
- Group discovery: browse / search public groups.
- Join / leave / request to join.

#### 2.6 Navigation from Social

- Domain nav rail to switch to Communication, Streaming, or E-Commerce.

### Data Models (Social)

```typescript
interface Post {
  id: string;
  author: User;
  group?: Group;
  type: 'text' | 'image' | 'video' | 'link' | 'poll';
  title: string;
  body: string;
  mediaUrls: string[];
  linkUrl?: string;
  poll?: Poll;
  upvotes: number;
  downvotes: number;
  score: number;                   // upvotes - downvotes
  userVote?: 'up' | 'down' | null;
  commentCount: number;
  shareCount: number;
  isSaved: boolean;
  createdAt: Date;
  editedAt?: Date;
}

interface Comment {
  id: string;
  postId: string;
  parentId?: string;             // null = top-level comment
  author: User;
  body: string;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote?: 'up' | 'down' | null;
  replies: Comment[];            // nested children
  replyCount: number;
  createdAt: Date;
  editedAt?: Date;
  isCollapsed: boolean;
}

interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
  visibility: 'public' | 'private' | 'restricted';
  memberCount: number;
  rules: GroupRule[];
  userRole?: 'owner' | 'moderator' | 'member' | null;
  createdAt: Date;
}

interface GroupRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface Poll {
  id: string;
  options: PollOption[];
  totalVotes: number;
  endsAt?: Date;
  userVotedOptionId?: string;
}

interface PollOption {
  id: string;
  label: string;
  votes: number;
  percentage: number;
}
```

### Component Hierarchy (Social)

```
SocialDomain/
├── SocialLayout                  # Feed area + sidebar (groups, trending)
├── Feed/
│   ├── FeedView                  # Home / Explore feed container
│   ├── FeedFilter                # Hot / New / Top toggle
│   ├── PostCard                  # Single post in feed
│   ├── PostVoteControls          # Upvote / Downvote
│   ├── PostActions               # Comment / Share / Save / Report
│   └── NewPostsBanner            # "5 new posts" floating banner
├── Post/
│   ├── PostDetail                # Full post page
│   ├── PostEditor                # Create / edit post form
│   ├── MediaGallery              # Image/video carousel
│   ├── PollWidget                # Poll display + vote
│   └── CommentSection/
│       ├── CommentTree           # Recursive threaded comments
│       ├── CommentItem           # Single comment
│       ├── CommentComposer       # Reply input
│       └── CommentSort           # Sort controls
├── Wall/
│   ├── UserWall                  # User's post history page
│   └── WallHeader                # User info + stats
├── Group/
│   ├── GroupFeed                 # Posts within a group
│   ├── GroupHeader               # Group info + join/leave
│   ├── GroupSidebar              # Rules, moderators, about
│   ├── GroupCreateModal          # Create new group
│   ├── GroupDiscovery            # Browse/search groups
│   └── Moderation/
│       ├── ModQueue              # Posts/comments pending review
│       ├── BanList               # Banned users management
│       └── RuleEditor            # Edit group rules
└── shared/
    ├── VoteButton                # Reusable up/down vote
    └── TimeAgo                   # Relative timestamp display
```

### Rendering Strategy

- **Virtualized list** (e.g., `react-window` or `@tanstack/virtual`)
  for feed and comment trees.
- **Cursor-based pagination** for infinite scroll (not offset-based).
- **Skeleton loaders** while fetching next page.
- **Optimistic updates** for votes and reactions.
- Images lazy-loaded with `IntersectionObserver`.

---

## Phase 3 — Streaming Domain

### Description

The Streaming Domain lets users create temporary streaming sessions
(called **Theaters**) to watch content together or stream their own
content to an audience, similar to Twitch or a Netflix watch-party.

### Features

#### 3.1 Theater Sessions

- User can **create a Theater** session:
  - Title, description, category/tags.
  - Content source: screen share, uploaded media, or external URL.
  - Visibility: public (anyone can join), private (invite-only),
    friends-only.
  - Schedule: start now or schedule for later.
- Theater has a **lifecycle**:
  - `CREATED` → `LIVE` → `ENDED`
  - Optional: `PAUSED` state for breaks.
- Theater host controls:
  - Play / pause / seek (for media).
  - Start / stop stream (for screen share).
  - Manage participants (kick, mute chat).
  - End session.

#### 3.2 Co-Watching / Co-Streaming

- **Invite friends** to a private Theater (via link or direct invite
  from Communication Domain).
- **Synchronized playback**: host controls the playback position,
  all viewers see the same frame (with tolerance for latency).
- General community can join public Theaters from a discovery page.

#### 3.3 Live Theater Chat

- Real-time chat sidebar within the Theater.
- Chat features: text, emoji, reactions to stream moments.
- Chat moderation: host or moderators can delete messages, slow mode,
  subscriber-only mode.
- Emote system (custom emotes per Theater or global).

#### 3.4 Theater Discovery

- Browse live and upcoming Theaters.
- Filter by: category, viewer count, friends watching.
- Search by title, host, or tag.
- "Currently watching" indicator on friends' profiles.

#### 3.5 Navigation from Streaming

- Domain nav rail to switch to Communication, Social, or E-Commerce.
- Minimized Theater picture-in-picture when navigating away (optional).

### Data Models (Streaming)

```typescript
interface Theater {
  id: string;
  host: User;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'private' | 'friends';
  status: 'created' | 'scheduled' | 'live' | 'paused' | 'ended';
  contentSource: ContentSource;
  viewerCount: number;
  maxViewers?: number;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

interface ContentSource {
  type: 'screen_share' | 'media_upload' | 'external_url';
  url?: string;
  mediaId?: string;
}

interface TheaterParticipant {
  user: User;
  role: 'host' | 'moderator' | 'viewer';
  joinedAt: Date;
  isChatMuted: boolean;
}

interface TheaterChatMessage {
  id: string;
  theaterId: string;
  sender: User;
  content: string;
  emotes: Emote[];
  createdAt: Date;
  isDeleted: boolean;
}

interface Emote {
  code: string;
  imageUrl: string;
  category: 'global' | 'theater';
}
```

### Component Hierarchy (Streaming)

```
StreamingDomain/
├── StreamingLayout               # Theater view + discovery
├── Discovery/
│   ├── TheaterBrowser            # Browse live/upcoming Theaters
│   ├── TheaterCard               # Single Theater preview card
│   ├── CategoryFilter            # Filter by category/tags
│   └── TheaterSearch             # Search Theaters
├── Theater/
│   ├── TheaterView               # Main Theater page (player + chat)
│   ├── TheaterPlayer             # Video/stream player
│   ├── TheaterControls           # Host: play/pause/seek/end
│   ├── TheaterInfo               # Title, description, viewer count
│   ├── TheaterChat/
│   │   ├── ChatPanel             # Chat sidebar
│   │   ├── ChatMessage           # Single chat message
│   │   ├── ChatInput             # Chat composer
│   │   ├── EmotePicker           # Emote selector
│   │   └── ChatModTools          # Slow mode, delete, mute
│   └── TheaterParticipants       # Viewer list
├── Create/
│   ├── CreateTheaterModal        # Create new Theater form
│   ├── SourcePicker              # Choose content source
│   └── InviteFriends             # Invite from friends list
└── shared/
    ├── ViewerCount               # Live viewer count badge
    ├── LiveBadge                 # "LIVE" indicator
    └── PictureInPicture          # Mini player overlay
```

### State Machine (Theater Lifecycle)

```
                ┌─────────────┐
                │   CREATED   │
                └──────┬──────┘
                       │  host starts
                       ▼
              ┌────────────────┐
     ┌───────▶│     LIVE       │◀──────┐
     │        └───────┬────────┘       │
     │                │                │
     │   host resumes │  host pauses   │
     │                ▼                │
     │        ┌────────────────┐       │
     └────────│    PAUSED      │───────┘
              └────────────────┘
                       │
                       │  host ends
                       ▼
              ┌────────────────┐
              │     ENDED      │
              └────────────────┘
```

### Real-Time Events (Streaming)

| Event | Direction | Payload |
|---|---|---|
| `theater:status` | Server → Client | `{ theaterId, status }` |
| `theater:viewer_joined` | Server → Client | `TheaterParticipant` |
| `theater:viewer_left` | Server → Client | `{ userId }` |
| `theater:chat_message` | Server → Client | `TheaterChatMessage` |
| `theater:chat_delete` | Server → Client | `{ messageId }` |
| `theater:playback_sync` | Server → Client | `{ position, isPlaying }` |
| `theater:invite` | Server → Client | `{ theaterId, inviter }` |

---

## Phase 4 — E-Commerce Domain (Buyer Experience)

### Description

The E-Commerce Domain provides an Amazon-like marketplace where users
can browse products from multiple vendors, view product details, manage
a shopping cart, and complete checkout.

### Features

#### 4.1 Product Browse

- **Home/Explore page**: featured products, categories, deals.
- **Category navigation**: hierarchical category tree.
- **Search**: full-text search with filters (price range, rating,
  category, vendor).
- **Sort**: price (low/high), rating, newest, best-selling.
- **Product grid** with pagination or infinite scroll.

#### 4.2 Product Detail Page (PDP)

- Product images (gallery / carousel).
- Title, description, price, availability.
- Vendor info (link to vendor's Shop).
- Ratings & reviews.
- Variant selection (size, color, etc.).
- "Add to Cart" / "Buy Now" actions.
- Related / recommended products.

#### 4.3 Cart

- Add / remove / update quantity.
- Cart persisted across sessions.
- Cart summary: subtotal, item count.
- Cart accessible from any page (mini-cart dropdown or slide-out).
- Apply coupons / promo codes.

#### 4.4 Checkout

- Shipping address selection / entry.
- Payment method selection (credit card, digital wallet, etc.).
- Order summary review.
- Place order → confirmation page.
- Order status tracking post-purchase.

#### 4.5 Reviews & Ratings

- Star rating (1–5) + text review.
- Review with photos.
- Helpful / not helpful voting on reviews.
- Sort reviews: most recent, most helpful, highest/lowest rating.

#### 4.6 Navigation from E-Commerce

- Domain nav rail to switch to Communication, Social, or Streaming.

### Data Models (E-Commerce — Buyer)

```typescript
interface Product {
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
  rating: number;                  // average
  reviewCount: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  createdAt: Date;
}

interface Money {
  amount: number;
  currency: string;                // ISO 4217
}

interface ProductImage {
  id: string;
  url: string;
  alt: string;
  order: number;
}

interface ProductVariant {
  id: string;
  label: string;                   // e.g., "Red / Large"
  sku: string;
  price: Money;
  stock: number;
  attributes: Record<string, string>;  // e.g., { color: 'Red', size: 'L' }
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  children?: Category[];
}

interface VendorSummary {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
  rating: number;
}

interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

interface Cart {
  items: CartItem[];
  subtotal: Money;
  itemCount: number;
  couponCode?: string;
  discount?: Money;
}

interface Order {
  id: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: PaymentMethodSummary;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  total: Money;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  placedAt: Date;
  updatedAt: Date;
}

interface OrderItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

interface Review {
  id: string;
  productId: string;
  author: User;
  rating: number;                  // 1–5
  title: string;
  body: string;
  images: string[];
  helpfulCount: number;
  createdAt: Date;
}
```

### Component Hierarchy (E-Commerce — Buyer)

```
CommerceDomain/
├── CommerceLayout                # Product area + cart access
├── Browse/
│   ├── ProductGrid               # Product listing (grid/list toggle)
│   ├── ProductCard               # Single product card
│   ├── CategoryNav               # Category tree navigation
│   ├── SearchBar                 # Search input + suggestions
│   ├── FilterPanel               # Price / Rating / Category filters
│   └── SortDropdown              # Sort options
├── Product/
│   ├── ProductDetail             # Full PDP
│   ├── ImageGallery              # Product images carousel
│   ├── VariantSelector           # Size / Color picker
│   ├── AddToCartButton           # Add to cart action
│   ├── PriceDisplay              # Price + compare-at price
│   ├── VendorLink                # Link to vendor shop
│   ├── ReviewSection/
│   │   ├── ReviewList            # List of reviews
│   │   ├── ReviewItem            # Single review
│   │   ├── ReviewForm            # Write a review
│   │   ├── RatingStars           # Star display
│   │   └── ReviewSort            # Sort reviews
│   └── RelatedProducts           # Recommended products carousel
├── Cart/
│   ├── CartPage                  # Full cart page
│   ├── MiniCart                  # Slide-out / dropdown cart
│   ├── CartItem                  # Single cart line item
│   ├── CartSummary               # Subtotal, discount, total
│   └── CouponInput               # Apply promo code
├── Checkout/
│   ├── CheckoutPage              # Multi-step checkout
│   ├── AddressForm               # Shipping address
│   ├── PaymentForm               # Payment method
│   ├── OrderReview               # Final order summary
│   └── OrderConfirmation         # Success page
└── Orders/
    ├── OrderHistory              # Past orders list
    ├── OrderDetail               # Single order detail
    └── OrderTracking             # Shipping status tracker
```

### State Transitions (Checkout)

```
BROWSING → ADD_TO_CART → CART_REVIEW → SHIPPING → PAYMENT → ORDER_REVIEW → PLACE_ORDER → CONFIRMATION
                                                                                  │
                                                                          (on failure)
                                                                                  │
                                                                          PAYMENT_ERROR → retry
```

---

## Phase 5 — E-Commerce Domain (Seller Experience)

### Description

Users can become **Vendors** by creating their own Shop. The seller
experience provides tools for inventory management, order fulfillment,
sales analytics, and ad campaigns.

### Features

#### 5.1 Shop Management

- Create a **Shop** (name, description, logo, banner).
- Shop public page: displays vendor's products to buyers.
- Shop settings: policies (return, shipping), contact info.

#### 5.2 Inventory Management

- Add / edit / remove products.
- Manage product variants (SKU, price, stock per variant).
- Bulk operations (import/export CSV).
- Low-stock alerts.
- Product status: draft, active, archived.

#### 5.3 Order Management

- View incoming orders.
- Update order status (confirmed → shipped → delivered).
- Process refunds / cancellations.
- Order detail with buyer info and shipping label.

#### 5.4 Sales Reports & Analytics Dashboard

- Revenue over time (daily / weekly / monthly charts).
- Top-selling products.
- Order volume and conversion rate.
- Customer demographics (if available).
- Exportable reports (CSV / PDF).

#### 5.5 Ad Campaigns

- Create ad campaigns to promote products.
- Campaign settings: budget, duration, targeting.
- Campaign performance metrics (impressions, clicks, conversions).

### Data Models (E-Commerce — Seller)

```typescript
interface Shop {
  id: string;
  owner: User;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  policies: ShopPolicies;
  rating: number;
  productCount: number;
  createdAt: Date;
}

interface ShopPolicies {
  returnPolicy: string;
  shippingPolicy: string;
  contactEmail: string;
}

interface InventoryItem {
  productId: string;
  variantId: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  status: 'draft' | 'active' | 'archived';
  lastRestockedAt?: Date;
}

interface SellerOrder {
  id: string;
  buyerId: string;
  buyerName: string;
  items: OrderItem[];
  shippingAddress: Address;
  total: Money;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  placedAt: Date;
  updatedAt: Date;
}

interface SalesReport {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  revenue: Money;
  orderCount: number;
  unitsSold: number;
  topProducts: TopProduct[];
  conversionRate: number;
}

interface TopProduct {
  product: Product;
  unitsSold: number;
  revenue: Money;
}

interface AdCampaign {
  id: string;
  shopId: string;
  productIds: string[];
  name: string;
  budget: Money;
  spent: Money;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'paused' | 'ended';
  metrics: CampaignMetrics;
}

interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;                     // click-through rate
  cpc: Money;                      // cost per click
}
```

### Component Hierarchy (E-Commerce — Seller)

```
CommerceDomain/Seller/
├── SellerLayout                  # Seller dashboard layout
├── Dashboard/
│   ├── DashboardOverview         # KPI cards (revenue, orders, views)
│   ├── RevenueChart              # Revenue over time
│   ├── TopProductsTable          # Best sellers
│   └── RecentOrders              # Latest orders preview
├── Shop/
│   ├── ShopSettings              # Edit shop info / policies
│   └── ShopPreview               # Public shop page preview
├── Inventory/
│   ├── ProductList               # All products table
│   ├── ProductEditor             # Add/edit product form
│   ├── VariantManager            # Manage variants per product
│   ├── BulkImport                # CSV import/export
│   └── LowStockAlert             # Low stock warnings
├── Orders/
│   ├── SellerOrderList           # Incoming orders
│   ├── SellerOrderDetail         # Order detail + status update
│   └── RefundModal               # Process refund
├── Analytics/
│   ├── SalesReportPage           # Full analytics page
│   ├── DateRangePicker           # Period selector
│   └── ExportButton              # Export CSV/PDF
└── Ads/
    ├── CampaignList              # All campaigns
    ├── CampaignEditor            # Create/edit campaign
    └── CampaignMetrics           # Performance dashboard
```

### Data Flow (Seller)

```
Seller creates product → Inventory updated → Product visible to buyers
                                                      │
Buyer places order ──────────────────────────────────▶│
                                                      ▼
                                               Seller sees order
                                                      │
                                        Seller updates status
                                     (confirmed → shipped → delivered)
                                                      │
                                               Analytics updated
                                            (revenue, units sold)
```

---

## Phase 6 — Hardening

### Description

Optimize the application for production-readiness across performance,
accessibility, and error handling.

### Performance

| Area | Strategy |
|---|---|
| **Bundle size** | Code-splitting per domain (lazy routes). Tree-shaking. Analyze with `webpack-bundle-analyzer` or Vite equivalent. |
| **Rendering** | Virtualized lists for feeds, messages, products. `React.memo` + `useMemo` / `useCallback` where profiled as needed. |
| **Images** | Responsive images (`srcSet`), lazy loading, WebP/AVIF format. CDN delivery. |
| **Network** | Request deduplication (TanStack Query). Prefetch on hover/focus. Stale-while-revalidate caching. |
| **Real-time** | Debounce/throttle typing indicators. Batch WebSocket updates. |
| **Perceived perf** | Skeleton screens. Optimistic updates. Instant page transitions. |

### Accessibility (a11y)

| Area | Strategy |
|---|---|
| **Keyboard** | All interactive elements focusable and operable via keyboard. Focus management on route changes and modals. |
| **Screen readers** | Semantic HTML (`nav`, `main`, `article`, `button`). ARIA labels, roles, live regions for dynamic content. |
| **Color contrast** | WCAG AA minimum (4.5:1 for text). High-contrast theme option. |
| **Motion** | Respect `prefers-reduced-motion`. Disable/reduce animations. |
| **Forms** | Associated labels, error announcements, fieldset/legend grouping. |
| **Testing** | `axe-core` automated tests. Manual screen reader testing (NVDA, VoiceOver). |

### Error Handling

| Scenario | Strategy |
|---|---|
| **API errors** | Global error interceptor. Per-request error states. User-friendly error messages. Retry for transient errors. |
| **Component errors** | React Error Boundaries at domain level and per-feature. Fallback UI. Error reporting to monitoring service. |
| **Network offline** | Detect with `navigator.onLine` + `online`/`offline` events. Show offline banner. Queue writes for retry. |
| **WebSocket disconnect** | Auto-reconnect with exponential backoff. "Reconnecting…" banner. Resubscribe to channels on reconnect. |
| **Validation errors** | Inline form validation. Server-side validation feedback. |

---

## Phase 7 — Integration & Cross-Domain Features

### Description

Connect domains so actions in one domain surface in others, creating
a cohesive super-app experience.

### Cross-Domain Interactions

| Source | Target | Interaction |
|---|---|---|
| Social → Communication | User clicks "Message" on a profile | Opens DM in Communication Domain |
| Social → Streaming | User shares a Theater link in a post | Theater embed / link preview in Social feed |
| Communication → Streaming | User invites friend to Theater from chat | Theater invite notification in chat |
| E-Commerce → Social | User shares a product to Social feed | Product card embed in Social post |
| E-Commerce → Communication | Buyer messages vendor | Opens DM with vendor in Communication |
| Streaming → E-Commerce | Host promotes product during stream | Product overlay / link in Theater |
| Any → Notification | Any domain event | Unified notification in bell dropdown |

### Unified Activity Feed

- Cross-domain activity stream: "Friend posted", "Friend is live",
  "Friend's shop has a sale".
- Accessible from Communication Domain sidebar or a dedicated
  Activity tab.

### Unified Search

- Global search bar that searches across all domains:
  - Users, messages, posts, groups, theaters, products.
- Results categorized by domain.

### Deep Linking

- Every entity has a shareable URL:
  - `/chat/:conversationId`
  - `/social/post/:postId`
  - `/social/group/:groupSlug`
  - `/theater/:theaterId`
  - `/shop/:vendorSlug/product/:productId`
- Deep links work from notifications, shares, and external sources.

---

## Phase 8 — Advanced Features

### Description

Layer in AI-powered features and experimentation infrastructure.

### AI Features

| Feature | Description |
|---|---|
| **AI Moderation** | Automatically flag/remove toxic content in chat, posts, comments, and theater chat. Configurable sensitivity. |
| **Smart Recommendations** | Personalized feed ranking, product recommendations, "Theaters you might like", "People you may know". |
| **Search Enhancement** | Semantic search, typo tolerance, natural language queries. |
| **Content Summarization** | Summarize long threads, group discussions, or product reviews. |
| **Chat Assistance** | Smart replies, message translation, chat bots for vendor customer service. |
| **Ad Targeting** | AI-optimized ad placement and audience targeting for vendor campaigns. |

### Experimentation

| Capability | Details |
|---|---|
| **Feature Flags** | Gradual rollout, A/B testing, user segment targeting. Use LaunchDarkly, Unleash, or custom. |
| **A/B Testing** | Feed algorithm variants, UI layout experiments, checkout flow optimization. |
| **Analytics** | Event tracking per domain. Funnel analysis. User journey mapping. |
| **Telemetry** | Performance metrics (Core Web Vitals), error rates, real-time dashboards. |

---

# AI Prompt Templates

## Global Prompt

```
You are a senior React + TypeScript frontend architect building a
multi-domain SPA (super-app). The app has four domains: Communication
(Discord-like), Social (Reddit-like), Streaming (Twitch-like), and
E-Commerce (Amazon-like).

Rules:
- No backend implementation — focus on frontend architecture only.
- Use domain models (not DTOs) in component logic.
- Prioritize scalability, performance, and accessibility.
- Use TanStack Query for server state, Zustand for UI state.
- Real-time via WebSocket with channel multiplexing.
- All lists must be virtualized. All routes must be lazy-loaded.
- Follow the folder structure: src/domains/{domain}/, src/shared/.
```

---

## Phase 0 Prompt

```
Design the frontend architecture foundation for the super-app.

Requirements:
- App shell with persistent domain navigation rail (Communication,
  Social, Streaming, E-Commerce).
- Auth flow: Login → Communication Domain (home). Sign-out → Login page.
- Protected routes with auth guards.
- Shared notification center and profile mechanism.
- Real-time WebSocket scaffold with reconnection.
- Type layering: DTO → Domain Model → View Model with mappers.
- State strategy: TanStack Query (server) + Zustand (UI).

Deliver:
- Complete folder structure.
- Component hierarchy for app shell.
- Auth state machine diagram.
- Data flow diagram (API → cache → domain model → view).
- List of shared hooks and utilities.
```

---

## Phase 1 Prompt

```
Design the Communication Domain (Discord-like) for the super-app.

Requirements:
- Direct Messages (1:1) and Rooms (group chat).
- Rich messaging: text, attachments (images, video, files), emoji
  reactions, edit, delete, reply/quote.
- Virtualized message list with optimistic UI.
- Rich composer: emoji picker, file upload, @mentions, reply-to.
- Presence system: online/offline/idle/DND + typing indicators.
- Real-time calls: voice, video, screen sharing via WebRTC.
- Floating/minimizable call window for cross-domain navigation.
- Read receipts and delivery status.

Deliver:
- Component hierarchy with all sub-components.
- WebSocket event table (event name, direction, payload).
- Domain model interfaces (Message, Conversation, CallSession, etc.).
- State management approach per feature.
- Edge cases and error handling strategy.
- UX flow diagrams for: sending a message, starting a call, creating
  a room.
```

---

## Phase 2 Prompt

```
Design the Social Domain (Reddit-like) for the super-app.

Requirements:
- Home Feed (followed users + groups) and Explore Feed (trending).
- Infinite scroll with virtualized rendering and cursor-based pagination.
- Post types: text, image, video, link, poll.
- Post actions: upvote/downvote, comment, share, save, report.
- Threaded/nested comment tree with collapsible threads.
- User Wall (profile page showing user's posts).
- Groups (subreddits): create, join, moderate, discover.
- Moderation tools: remove content, ban users, approve/reject posts.

Deliver:
- Component hierarchy for Feed, Post, Comment, Group, Moderation.
- Domain model interfaces (Post, Comment, Group, Poll, etc.).
- Rendering strategy for infinite scroll + comment trees.
- Data fetching patterns (cursor pagination, optimistic votes).
- Moderation workflow diagram.
- Edge cases: empty states, deleted content, deep threads.
```

---

## Phase 3 Prompt

```
Design the Streaming Domain (Twitch/Netflix-party-like) for the super-app.

Requirements:
- Theater creation: title, content source (screen share, media, URL),
  visibility (public/private/friends).
- Theater lifecycle: CREATED → LIVE → PAUSED → ENDED.
- Synchronized playback for co-watching.
- Live chat sidebar with moderation (slow mode, delete, mute).
- Theater discovery: browse live/upcoming, filter by category.
- Invite friends from Communication Domain.
- Picture-in-picture when navigating away.

Deliver:
- Component hierarchy for Discovery, Theater, Chat, Create.
- State machine diagram for Theater lifecycle.
- WebSocket event table for streaming events.
- Domain model interfaces (Theater, ContentSource, TheaterParticipant).
- Architecture for synchronized playback.
- Edge cases: host disconnect, stream lag, chat flood.
```

---

## Phase 4 Prompt

```
Design the E-Commerce Buyer experience (Amazon-like) for the super-app.

Requirements:
- Product browsing: categories, search, filters, sort.
- Product Detail Page: images, variants, pricing, reviews.
- Shopping cart: add/remove, quantity update, coupons, persistence.
- Checkout flow: address → payment → review → confirmation.
- Order history and tracking.
- Ratings and reviews with photos.

Deliver:
- Component hierarchy for Browse, PDP, Cart, Checkout, Orders.
- Domain model interfaces (Product, Cart, Order, Review, etc.).
- State transitions for checkout flow.
- UX flow diagram: browse → PDP → cart → checkout → confirmation.
- Data fetching strategy (search, pagination, cart sync).
- Edge cases: out of stock during checkout, payment failure, cart
  conflicts.
```

---

## Phase 5 Prompt

```
Design the E-Commerce Seller experience for the super-app.

Requirements:
- Shop creation and management (name, logo, policies).
- Inventory: add/edit/remove products, manage variants and stock.
- Order management: view, update status, process refunds.
- Sales analytics dashboard: revenue charts, top products, conversion.
- Ad campaigns: create, manage, track performance.

Deliver:
- Component hierarchy for Dashboard, Shop, Inventory, Orders, Analytics, Ads.
- Domain model interfaces (Shop, InventoryItem, SellerOrder, SalesReport, AdCampaign).
- Data flow diagram: product creation → buyer purchase → order → analytics.
- Dashboard wireframe description.
- Edge cases: concurrent stock updates, refund edge cases.
```

---

## Phase 6 Prompt

```
Design hardening improvements for the super-app.

Focus areas:
- Performance: bundle splitting, virtualization audit, image
  optimization, network efficiency, perceived performance.
- Accessibility: keyboard navigation, screen reader support, color
  contrast, motion preferences, form accessibility.
- Error handling: API errors, component errors (Error Boundaries),
  offline support, WebSocket reconnection, validation errors.

Deliver:
- Performance optimization checklist with specific techniques.
- Accessibility audit checklist mapped to WCAG 2.1 AA.
- Error handling strategy per error category.
- Monitoring and alerting recommendations.
```

---

## Phase 7 Prompt

```
Design cross-domain integration for the super-app.

Requirements:
- Cross-domain interactions (e.g., message vendor from shop, share
  product to social feed, invite to theater from chat).
- Unified notification center aggregating events from all domains.
- Unified search across users, messages, posts, theaters, products.
- Deep linking for all entities.
- Cross-domain activity feed.

Deliver:
- Interaction matrix (source domain → target domain → action).
- Notification type catalog per domain.
- Unified search architecture.
- Deep link URL scheme.
- Event bus / pub-sub architecture for cross-domain communication.
```

---

## Phase 8 Prompt

```
Design advanced AI and experimentation features for the super-app.

Requirements:
- AI moderation for chat, posts, comments, theater chat.
- Personalized recommendations (feed, products, theaters, people).
- Semantic search enhancement.
- Content summarization for threads and reviews.
- Feature flag system for gradual rollout and A/B testing.
- Analytics and telemetry infrastructure.

Deliver:
- AI feature integration points per domain.
- Recommendation engine interface (frontend contract).
- Feature flag architecture and SDK integration.
- A/B testing framework design.
- Telemetry event catalog.
```

---

## End of Document
