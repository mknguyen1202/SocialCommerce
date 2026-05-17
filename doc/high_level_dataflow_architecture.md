# SocialCommerce — High-Level Dataflow & Architecture

## Overview

SocialCommerce is a **super-app** that unifies social networking,
real-time communication, live streaming, and a commerce marketplace
into a single platform. The backend is composed of **16 domain
services**, a shared **Contracts** library, and two messaging
systems — **Azure Service Bus** and **Redis Pub/Sub** — for
asynchronous cross-service communication.

All browser traffic enters through a single **BFF (Backend for
Frontend)** gateway — **UserService** — which authenticates users via
OIDC providers, manages encrypted session cookies, and issues
short-lived internal JWTs to downstream services.

---

## Service Inventory

| # | Service | Port | Domain | Storage |
|---|---|---|---|---|
| 1 | **UserService** (BFF) | 5001 | Authentication, profiles, BFF proxy | PostgreSQL (`user_db`) |
| 2 | **SocialGraphService** | 5002 | Follow/unfollow, blocks, friend requests | PostgreSQL (`social_graph_db`) |
| 3 | **SocialContentService** | 5003 | Posts, comments, reactions, polls, groups | PostgreSQL (`social_content_db`) |
| 4 | **FeedService** | 5004 | Home/user/explore feeds, fan-out on write | PostgreSQL (`feed_db`) + Redis |
| 5 | **ModerationService** | 5005 | Reports, decisions, enforcement, AI auto-flag | PostgreSQL (`moderation_db`) + Redis |
| 6 | **MediaService** | 5006 | File upload/download, blob storage | PostgreSQL (`media_db`) + Blob Storage |
| 7 | **RealTimeHub** | 5007 | Centralized SignalR WebSocket gateway | Redis (backplane) |
| 8 | **CommunicationService** | 5008 | DM & room conversations, messages | PostgreSQL (`communication_db`) |
| 9 | **PresenceService** | 5009 | Online/offline/idle status, typing indicators | Redis (TTL-based) |
| 10 | **SignalingService** | 5010 | WebRTC call sessions, SDP/ICE relay | PostgreSQL (`signaling_db`) |
| 11 | **StreamingService** | 5011 | Co-watching theaters, live chat, emotes | PostgreSQL (`streaming_db`) |
| 12 | **CommerceService** | 5012 | Product catalog, cart, coupons, reviews | PostgreSQL (`commerce_db`) |
| 13 | **OrderService** | 5013 | Checkout, orders, shipments | PostgreSQL (`order_db`) |
| 14 | **InventoryService** | 5014 | Seller shops, products, variants, stock | PostgreSQL (`inventory_db`) |
| 15 | **AnalyticsService** | 5015 | Seller dashboard, revenue, top products | PostgreSQL (`analytics_db`) + Redis |
| 16 | **AdService** | 5016 | Ad campaigns, impressions, clicks | PostgreSQL (`ad_db`) |
| 17 | **NotificationService** | 5017 | Cross-domain notification persistence & push | PostgreSQL (`notification_db`) + Redis |
| 18 | **SearchService** | 5018 | Unified full-text search (users, posts, products) | PostgreSQL (`search_db` — tsvector) |

**Shared library:** `Contracts` — defines the `DomainEvent` envelope, `EventTypes` constants, and `NotificationPayload` used by all services.

---

## Platform Architecture

```mermaid
graph TB
    subgraph Client ["CLIENT (Browser)"]
        SPA["React SPA"]
        SR["SignalR Client"]
    end

    SPA -- "REST (cookie + CSRF)" --> BFF
    SR -- "WebSocket /hubs/app (JWT)" --> RTHub

    subgraph BFF ["UserService (BFF) :5001"]
        Auth["OIDC Auth<br />(Google · Facebook · Apple)"]
        Session["Encrypted Session Cookies<br />+ CSRF Double-Submit"]
        Proxy["BFF Proxy Middleware<br />→ JWT Issuance<br />→ Route to downstream"]
    end

    subgraph Foundations ["Phase 6 — Foundations"]
        Media["MediaService :5006<br />(file upload/download)"]
        RTHub["RealTimeHub :5007<br />(SignalR gateway)"]
    end

    subgraph Communication ["Phase 1 — Communication"]
        Comm["CommunicationService :5008<br />(conversations, messages)"]
        Pres["PresenceService :5009<br />(online status)"]
        Sig["SignalingService :5010<br />(WebRTC calls)"]
    end

    subgraph Social ["Phase 2 — Social"]
        SCS["SocialContentService :5003<br />(posts, groups, polls)"]
        SGS["SocialGraphService :5002<br />(follows, blocks, friends)"]
        Feed["FeedService :5004<br />(home/explore feeds)"]
        Mod["ModerationService :5005<br />(reports, enforcement)"]
    end

    subgraph Streaming ["Phase 3 — Streaming"]
        Stream["StreamingService :5011<br />(co-watching theaters)"]
    end

    subgraph Commerce ["Phase 4 — Commerce & Platform"]
        ComSvc["CommerceService :5012<br />(catalog, cart, reviews)"]
        Ord["OrderService :5013<br />(checkout, orders)"]
        Inv["InventoryService :5014<br />(shops, products, stock)"]
        Anl["AnalyticsService :5015<br />(seller dashboard)"]
        Ad["AdService :5016<br />(ad campaigns)"]
        Notif["NotificationService :5017<br />(notifications)"]
        Search["SearchService :5018<br />(full-text search)"]
    end

    BFF -- "JWT Bearer" --> Communication
    BFF -- "JWT Bearer" --> Social
    BFF -- "JWT Bearer" --> Streaming
    BFF -- "JWT Bearer" --> Commerce
    BFF -- "avatar upload" --> Media

    Comm -- "POST /internal/hub/publish" --> RTHub
    Pres -- "POST /internal/hub/publish" --> RTHub
    Sig -- "POST /internal/hub/publish" --> RTHub
    Stream -- "POST /internal/hub/publish" --> RTHub
    Notif -- "POST /internal/hub/publish" --> RTHub

    subgraph EventBus ["Event Bus"]
        ASB["Azure Service Bus<br />(topic: social-events)"]
        Redis["Redis Pub/Sub<br />(evt:* channels)"]
    end

    SCS -- "post.created / content.removed" --> ASB
    ASB -- "feed-subscriber" --> Feed

    Communication -- "evt:message:new<br />evt:call:incoming" --> Redis
    Social -- "evt:friend:request<br />evt:post:reply<br />evt:post:mention<br />evt:group:invite" --> Redis
    Streaming -- "evt:theater:invite<br />evt:theater:live" --> Redis
    Ord -- "evt:order:placed<br />evt:order:update" --> Redis

    Redis --> Notif
    Redis --> Anl

    subgraph Storage ["PostgreSQL 16"]
        DB["12 isolated databases<br />(one per service)"]
    end

    subgraph RedisStore ["Redis 7"]
        BP["SignalR Backplane (sc-rt)"]
        Sess["Presence TTL keys"]
        TL["Timeline cache"]
        EVT["Event channels (evt:*)"]
    end
```

---

## Authentication & Request Flow

Every browser request passes through the **UserService BFF**. The SPA
never holds long-lived tokens — authentication state lives in
server-side encrypted cookies.

```mermaid
sequenceDiagram
    participant Browser as React SPA
    participant BFF as UserService (BFF :5001)
    participant IdP as Identity Provider
    participant Svc as Downstream Service

    Browser->>BFF: GET /auth/login/{provider}
    BFF-->>Browser: 302 → IdP (PKCE + state + nonce)
    Browser->>IdP: User authenticates
    IdP-->>Browser: 302 → /auth/callback with code
    Browser->>BFF: GET /auth/callback/{provider}/signin?code=xxx

    Note right of BFF: Exchange code → id_token<br/>Validate claims<br/>Upsert User + ExternalLogin<br/>Issue encrypted session cookie<br/>+ CSRF cookie

    BFF-->>Browser: Set-Cookie (App.Auth + App.CSRF)

    Note over Browser: Subsequent API calls

    Browser->>BFF: GET /api/{service}/resource<br/>Cookie: App.Auth<br/>X-XSRF-TOKEN: {csrf}

    Note right of BFF: Validate session cookie<br/>Validate CSRF token<br/>Issue short-lived JWT (uid, iss, exp)<br/>→ HMAC-SHA256

    BFF->>Svc: Forward request<br/>Authorization: Bearer {jwt}

    Note over Svc: Validate JWT signature,<br/>issuer, expiration<br/>Extract uid claim

    Svc-->>BFF: Response
    BFF-->>Browser: Response
```

---

## BFF Proxy Routing

The `ProxyMiddleware` in UserService maps URL prefixes to downstream
services, attaching the internal JWT to each forwarded request.

```mermaid
flowchart LR
    subgraph Routes ["Browser Request Paths"]
        R1["/api/conversations/*"]
        R2["/api/presence/*"]
        R3["/api/calls/*"]
        R4["/api/social/*"]
        R5["/api/graph/*"]
        R6["/api/feed/*"]
        R7["/api/moderation/*"]
        R8["/api/theaters/*"]
        R9["/api/products/*"]
        R10["/api/orders/*"]
        R11["/api/inventory/*"]
        R12["/api/analytics/*"]
        R13["/api/ads/*"]
        R14["/api/notifications/*"]
        R15["/api/search/*"]
        R16["/media/*"]
    end

    subgraph Proxy ["UserService BFF Proxy"]
        MW["ProxyMiddleware<br/>Match path → resolve target<br/>Attach Authorization: Bearer JWT"]
    end

    subgraph Targets ["Downstream Services"]
        T1["CommunicationService :5008"]
        T2["PresenceService :5009"]
        T3["SignalingService :5010"]
        T4["SocialContentService :5003"]
        T5["SocialGraphService :5002"]
        T6["FeedService :5004"]
        T7["ModerationService :5005"]
        T8["StreamingService :5011"]
        T9["CommerceService :5012"]
        T10["OrderService :5013"]
        T11["InventoryService :5014"]
        T12["AnalyticsService :5015"]
        T13["AdService :5016"]
        T14["NotificationService :5017"]
        T15["SearchService :5018"]
        T16["MediaService :5006"]
    end

    R1 --> MW --> T1
    R2 --> MW --> T2
    R3 --> MW --> T3
    R4 --> MW --> T4
    R5 --> MW --> T5
    R6 --> MW --> T6
    R7 --> MW --> T7
    R8 --> MW --> T8
    R9 --> MW --> T9
    R10 --> MW --> T10
    R11 --> MW --> T11
    R12 --> MW --> T12
    R13 --> MW --> T13
    R14 --> MW --> T14
    R15 --> MW --> T15
    R16 --> MW --> T16
```

---

## Real-Time Event Delivery

All real-time push to the browser flows through the centralized
**RealTimeHub** (SignalR). Domain services publish events via an
internal HTTP API; the hub broadcasts them over WebSocket connections.

```mermaid
graph TB
    subgraph Publishers ["Domain Services (Internal HTTP Push)"]
        Comm["CommunicationService<br />(new message, reaction, typing)"]
        Pres["PresenceService<br />(status change)"]
        Sig["SignalingService<br />(call offer, ICE candidate)"]
        Stream["StreamingService<br />(playback sync, chat, emotes)"]
        Notif["NotificationService<br />(all notification types)"]
    end

    subgraph Hub ["RealTimeHub :5007"]
        API["POST /internal/hub/publish<br />(X-Internal-Api-Key)"]
        SignalR["AppHub (/hubs/app)<br />SignalR WebSocket"]
        Backplane["Redis Backplane<br />(sc-rt channel prefix)"]
    end

    subgraph Clients ["Connected Browsers"]
        C1["User A"]
        C2["User B"]
        C3["User C"]
    end

    Comm --> API
    Pres --> API
    Sig --> API
    Stream --> API
    Notif --> API

    API --> SignalR
    SignalR --> Backplane
    Backplane --> SignalR
    SignalR --> C1
    SignalR --> C2
    SignalR --> C3
```

---

## Asynchronous Event Bus

The platform uses **two complementary messaging systems** for
asynchronous cross-service communication:

| Bus | Purpose | Producers | Consumers |
|---|---|---|---|
| **Azure Service Bus** | Social content fan-out | SocialContentService | FeedService |
| **Redis Pub/Sub** | Cross-domain notifications & analytics | All domain services | NotificationService, AnalyticsService |

```mermaid
graph TB
    subgraph ASBFlow ["Azure Service Bus — Feed Fan-Out"]
        SCS["SocialContentService"]
        Topic["Topic: social-events"]
        FeedSub["Subscription: feed-subscriber"]
        Feed["FeedService<br />(EventSubscriber)"]

        SCS -- "post.created<br />content.removed" --> Topic
        Topic --> FeedSub --> Feed
    end

    subgraph RedisFlow ["Redis Pub/Sub — Notifications & Analytics"]
        P1["CommunicationService<br />evt:message:new · evt:call:incoming"]
        P2["SocialGraphService<br />evt:friend:request"]
        P3["SocialContentService<br />evt:post:reply · evt:post:mention<br />evt:group:invite"]
        P4["StreamingService<br />evt:theater:invite · evt:theater:live"]
        P5["OrderService<br />evt:order:placed · evt:order:update"]

        Redis["Redis Pub/Sub<br />(evt:* channels)"]

        NotifSvc["NotificationService<br />(subscribes to ALL channels)"]
        AnlSvc["AnalyticsService<br />(subscribes to evt:order:placed)"]

        P1 --> Redis
        P2 --> Redis
        P3 --> Redis
        P4 --> Redis
        P5 --> Redis
        Redis --> NotifSvc
        Redis --> AnlSvc
    end
```

### Event Envelope

All events share the `DomainEvent` envelope from the **Contracts**
library:

```
DomainEvent {
    Id:        Guid
    Type:      string        // e.g. "evt:order:placed"
    Source:    string        // originating service
    Timestamp: DateTimeOffset
    Data:      object?       // event-specific payload
}
```

---

## Inter-Service HTTP Dependencies

Beyond the BFF proxy, services communicate directly via internal HTTP
calls for synchronous operations:

```mermaid
graph LR
    subgraph Sync ["Synchronous HTTP (Internal)"]
        Feed -- "GET followers, blocks" --> SGS["SocialGraphService"]
        Feed -- "GET group posts" --> SCS["SocialContentService"]
        Ord["OrderService"] -- "POST /internal/seller-orders/sync" --> Inv["InventoryService"]
        Ord -- "POST /internal/analytics/order-placed" --> Anl["AnalyticsService"]
        Client["FeedService / Client"] -- "POST /internal/ads/record-impression" --> Ad["AdService"]
        Client -- "POST /internal/ads/record-click" --> Ad
        BFF["UserService"] -- "avatar upload proxy" --> Media["MediaService"]
    end
```

| Caller | Callee | Endpoint | Purpose |
|---|---|---|---|
| FeedService | SocialGraphService | `GET /api/graph/{id}/followers` | Fan-out target list |
| FeedService | SocialContentService | `GET /api/social/groups/{slug}/posts` | Group feed proxy |
| OrderService | InventoryService | `POST /internal/seller-orders/sync` | Sync placed order to seller |
| OrderService | AnalyticsService | `POST /internal/analytics/order-placed` | Analytics ingestion |
| FeedService / Client | AdService | `POST /internal/ads/record-impression` | Track ad impression |
| FeedService / Client | AdService | `POST /internal/ads/record-click` | Track ad click |
| UserService | MediaService | `POST /media/upload` | Avatar upload proxy |

---

## Data Storage Layout

Each service owns its **isolated PostgreSQL database** — no
cross-database joins. Redis is shared but used for distinct concerns.

```mermaid
graph TB
    subgraph PG ["PostgreSQL 16"]
        user_db["user_db<br />(UserService)"]
        social_graph_db["social_graph_db<br />(SocialGraphService)"]
        social_content_db["social_content_db<br />(SocialContentService)"]
        feed_db["feed_db<br />(FeedService)"]
        moderation_db["moderation_db<br />(ModerationService)"]
        media_db["media_db<br />(MediaService)"]
        communication_db["communication_db<br />(CommunicationService)"]
        signaling_db["signaling_db<br />(SignalingService)"]
        streaming_db["streaming_db<br />(StreamingService)"]
        commerce_db["commerce_db<br />(CommerceService)"]
        order_db["order_db<br />(OrderService)"]
        inventory_db["inventory_db<br />(InventoryService)"]
        analytics_db["analytics_db<br />(AnalyticsService)"]
        ad_db["ad_db<br />(AdService)"]
        notification_db["notification_db<br />(NotificationService)"]
        search_db["search_db<br />(SearchService)"]
    end

    subgraph Redis ["Redis 7"]
        backplane["SignalR Backplane<br />(sc-rt:*)"]
        presence["Presence Keys<br />(TTL-based)"]
        timeline["Timeline Cache<br />(timeline:{userId}:*)"]
        modcache["Moderation Decision Cache"]
        events["Event Channels<br />(evt:*)"]
    end

    subgraph Blob ["Blob Storage"]
        blobs["Media Files<br />(Azure Blob / Local FS)"]
    end
```

---

## Domain Groupings & Phases

The platform is organized into **seven phases** of development, each
building on the previous:

```mermaid
graph TB
    subgraph P6 ["Phase 6 — Foundations"]
        F1["UserService :5001"]
        F2["MediaService :5006"]
        F3["RealTimeHub :5007"]
        F4["Contracts (shared library)"]
    end

    subgraph P1 ["Phase 1 — Communication"]
        C1["CommunicationService :5008"]
        C2["PresenceService :5009"]
        C3["SignalingService :5010"]
    end

    subgraph P2 ["Phase 2 — Social"]
        S1["SocialContentService :5003"]
        S2["SocialGraphService :5002"]
        S3["FeedService :5004"]
        S4["ModerationService :5005"]
    end

    subgraph P3 ["Phase 3 — Streaming"]
        ST1["StreamingService :5011"]
    end

    subgraph P4 ["Phase 4 — Commerce & Platform"]
        CM1["CommerceService :5012"]
        CM2["OrderService :5013"]
        CM3["InventoryService :5014"]
        CM4["AnalyticsService :5015"]
        CM5["AdService :5016"]
        CM6["NotificationService :5017"]
        CM7["SearchService :5018"]
    end

    subgraph P5 ["Phase 5 — Integration"]
        I1["BFF Proxy Middleware"]
        I2["Cross-domain Feed Aggregation"]
        I3["Event Bus Wiring"]
    end

    subgraph P7 ["Phase 7 — Seller Experience"]
        SE1["Shop & Catalog Management"]
        SE2["Order Fulfillment"]
        SE3["Sales Analytics Dashboard"]
        SE4["Ad Campaigns"]
    end

    P6 --> P1
    P6 --> P2
    P6 --> P3
    P1 --> P4
    P2 --> P4
    P3 --> P4
    P4 --> P5
    P4 --> P7
```

---

## End-to-End Buyer Purchase Flow

This sequence illustrates how services collaborate during a buyer
purchase — spanning commerce, checkout, seller sync, analytics, and
notifications:

```mermaid
sequenceDiagram
    participant Buyer as Buyer (Browser)
    participant BFF as UserService (BFF)
    participant Com as CommerceService
    participant Ord as OrderService
    participant Inv as InventoryService
    participant Anl as AnalyticsService
    participant Redis as Redis Pub/Sub
    participant Notif as NotificationService
    participant RTHub as RealTimeHub
    participant Seller as Seller (Browser)

    Buyer->>BFF: Add to cart / Checkout
    BFF->>Com: Cart operations (JWT)
    BFF->>Ord: POST /checkout/{sessionId}/place (JWT)

    Note right of Ord: Create Order + OrderItems

    Ord->>Inv: POST /internal/seller-orders/sync<br/>{orderId, sellerId, items}
    Note right of Inv: Create SellerOrder (pending)

    Ord->>Anl: POST /internal/analytics/order-placed<br/>{shopId, totalCents, items}
    Note right of Anl: Upsert daily SalesSummary

    Ord->>Redis: PUBLISH evt:order:placed

    Redis->>Notif: Deliver event
    Notif->>RTHub: POST /internal/hub/publish<br/>(new order notification)
    RTHub->>Seller: WebSocket push<br/>"New order received!"

    Redis->>Anl: Deliver event (redundant path)

    Ord-->>BFF: 201 Created
    BFF-->>Buyer: Order confirmed
```

---

## End-to-End Social Content Flow

This sequence shows the path of a social post — from creation through
feed fan-out and real-time notification delivery:

```mermaid
sequenceDiagram
    participant Author as Author (Browser)
    participant BFF as UserService (BFF)
    participant SCS as SocialContentService
    participant ASB as Azure Service Bus
    participant Feed as FeedService
    participant SGS as SocialGraphService
    participant Redis as Redis Pub/Sub
    participant Notif as NotificationService
    participant RTHub as RealTimeHub
    participant Follower as Follower (Browser)

    Author->>BFF: POST /api/social/posts
    BFF->>SCS: Create post (JWT)
    SCS-->>BFF: 201 Created

    SCS->>ASB: Publish "post.created"<br/>(topic: social-events)
    ASB->>Feed: Deliver (feed-subscriber)

    Feed->>SGS: GET /api/graph/{authorId}/followers
    SGS-->>Feed: follower list

    Note right of Feed: Fan-out on write:<br/>Insert post ref into each<br/>follower's timeline

    SCS->>Redis: PUBLISH evt:post:mention<br/>(if mentions present)
    Redis->>Notif: Deliver event
    Notif->>RTHub: POST /internal/hub/publish
    RTHub->>Follower: WebSocket push<br/>"@author mentioned you!"
```

---

## Cross-Cutting Concerns

### Shared JWT Authentication

All services validate the same **HMAC-SHA256 symmetric key JWT**
issued by UserService. No service issues its own tokens.

| Claim | Value | Purpose |
|---|---|---|
| `uid` | User ID (GUID) | Primary identity for all service authorization |
| `iss` | `"SocialCommerce"` | Validated by every downstream service |
| `exp` | Now + 5 min | Short-lived; BFF issues fresh token per request |

### Internal Endpoints

Service-to-service endpoints (prefixed with `/internal/`) use
`[AllowAnonymous]` for simplified local development. In production,
these are protected by API keys (`X-Internal-Api-Key`) or network-level
policies.

### Cursor-Based Pagination

All list endpoints use **cursor-based pagination** with UTC ticks
encoding, providing consistent, performant paging across all services.

### Per-Service Database Isolation

Each service owns its database exclusively — no cross-database joins.
Data sharing happens through HTTP APIs or event bus messages, following
**bounded context** ownership principles.

---

## Phase Reference

| Phase | Document | Focus |
|---|---|---|
| Phase 1 | [`phase1_communication_dataflow_architecture.md`](phase1_communication_dataflow_architecture.md) | Messaging, presence, WebRTC calls |
| Phase 2 | [`phase2_social_dataflow_architecture.md`](phase2_social_dataflow_architecture.md) | Posts, social graph, feeds, moderation |
| Phase 3 | [`phase3_streaming_dataflow_architecture.md`](phase3_streaming_dataflow_architecture.md) | Co-watching theaters, live chat |
| Phase 4 | [`phase4_commerce_platform_dataflow_architecture.md`](phase4_commerce_platform_dataflow_architecture.md) | Commerce, orders, notifications, search, ads |
| Phase 5 | [`phase5_integration_platform_dataflow_architecture.md`](phase5_integration_platform_dataflow_architecture.md) | BFF gateway, feed aggregation, event wiring |
| Phase 6 | [`phase6_foundations_dataflow_architecture.md`](phase6_foundations_dataflow_architecture.md) | UserService, MediaService, RealTimeHub |
| Phase 7 | [`phase7_seller_experience_dataflow_architecture.md`](phase7_seller_experience_dataflow_architecture.md) | Seller shops, catalog, fulfillment, analytics, ads |

---

## End of Document
