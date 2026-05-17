# Backend Development Strategy — SocialCommerce Super App

## Overview

This document defines the **phased backend development strategy** for the
SocialCommerce super-app. It is the direct counterpart to the
[React + TypeScript frontend strategy](./react_superapp_strategy_with_ai.md).

The backend is built with **ASP.NET Core (.NET 9)** following a
**microservices architecture** backed by **PostgreSQL**, **Redis**,
**SignalR**, and a **BFF (Backend for Frontend)** API gateway layer.

### Technology Stack

| Concern | Choice |
|---|---|
| **Runtime** | ASP.NET Core .NET 9 |
| **Primary DB** | PostgreSQL 16 (per-service schema isolation) |
| **Cache / Pub-Sub** | Redis 7 |
| **Real-Time** | ASP.NET Core SignalR (WebSocket / SSE fallback) |
| **Auth** | Cookie-based BFF session + JWT for service-to-service |
| **ORM** | Entity Framework Core 9 |
| **Message Broker** | Redis Pub/Sub (dev) → Azure Service Bus / RabbitMQ (prod) |
| **Object Storage** | Azure Blob Storage (avatars, attachments, media) |
| **Search** | PostgreSQL full-text (dev) → Elasticsearch / Azure AI Search (prod) |
| **API Docs** | OpenAPI / Scalar UI per service |
| **Containerization** | Docker Compose (dev) → Kubernetes (prod) |

---

## Service Catalog

| Service | Port | Status | Phase |
|---|---|---|---|
| **UserService** | 5001 | ✅ Exists | 0 |
| **SocialGraphService** | 5002 | ✅ Exists | 2 |
| **SocialContentService** | 5003 | ✅ Exists | 2 |
| **FeedService** | 5004 | ✅ Exists | 2 |
| **ModerationService** | 5005 | ✅ Exists | 2 |
| **MediaService** | 5006 | 🔲 Planned | 0 |
| **RealTimeHub** | 5007 | 🔲 Planned | 0 |
| **CommunicationService** | 5008 | 🔲 Planned | 1 |
| **PresenceService** | 5009 | 🔲 Planned | 1 |
| **SignalingService** | 5010 | 🔲 Planned | 1 |
| **StreamingService** | 5011 | 🔲 Planned | 3 |
| **CommerceService** | 5012 | 🔲 Planned | 4 |
| **OrderService** | 5013 | 🔲 Planned | 4 |
| **InventoryService** | 5014 | 🔲 Planned | 5 |
| **AnalyticsService** | 5015 | 🔲 Planned | 5 |
| **AdService** | 5016 | 🔲 Planned | 5 |
| **NotificationService** | 5017 | 🔲 Planned | 7 |
| **SearchService** | 5018 | 🔲 Planned | 7 |

---

## Architecture Diagram

```
                          ┌──────────────────────────────┐
                          │        BFF / API Gateway      │
                          │   (UserService — port 5001)   │
                          │  Auth Cookie · CSRF · Routes  │
                          └──────────┬───────────────────┘
                                     │ internal JWT
              ┌──────────────────────┼──────────────────────────┐
              │                      │                          │
   ┌──────────▼──────┐  ┌────────────▼───────┐  ┌──────────────▼─────────┐
   │ CommunicationSvc│  │  SocialContent/Feed │  │  Commerce / Order /    │
   │ Presence/Signal │  │  SocialGraph / Mod  │  │  Inventory / Analytics │
   └──────────┬──────┘  └────────────┬───────┘  └──────────────┬─────────┘
              │                      │                          │
              └──────────────────────▼──────────────────────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │         RealTimeHub            │
                     │  (SignalR — port 5007)         │
                     │  Channels · Backplane (Redis)  │
                     └───────────────────────────────┘
                                     │
                         ┌───────────▼──────────┐
                         │       Redis 7         │
                         │  Cache · Pub/Sub ·    │
                         │  Backplane · Queues   │
                         └──────────────────────┘

   PostgreSQL 16 ─── each service owns its own schema/database
   Azure Blob      ─── MediaService (avatars, attachments, vod)
```

---

## Phase 0 — Foundations

### Goals

Establish the shared infrastructure that all domain services depend on:
Auth, identity, media upload, API gateway, real-time hub scaffold, and
cross-cutting service conventions.

---

### 0.1 UserService (Extend Existing)

**Responsibilities:** Authentication BFF, user profile management,
OAuth provider integration, JWT issuance for service-to-service calls.

#### Existing Capabilities

- Cookie-based BFF session (`/auth/login/{provider}`, `/auth/callback`,
  `/auth/me`, `/auth/logout`).
- CSRF double-submit cookie pattern.
- External OAuth (Google, GitHub, etc.) via `ExternalLoginService`.
- `UserProfile` entity: `Id`, `IdentityId`, `DisplayName`, `Email`,
  `AvatarUrl`.
- EF Core + PostgreSQL migrations.

#### Additions Needed

| Endpoint | Method | Description |
|---|---|---|
| `/profile/me` | `GET` | Full authenticated user profile |
| `/profile/me` | `PATCH` | Update display name, bio, avatar |
| `/profile/{userId}` | `GET` | Public profile (any user) |
| `/profile/me/avatar` | `POST` | Upload avatar (delegates to MediaService) |
| `/internal/users/{userId}` | `GET` | Service-to-service user lookup (JWT-protected) |

#### Entity Additions

```csharp
// Extend UserProfile with:
string? Username         // unique, URL-safe handle
string? Bio              // short description
string? BannerUrl        // profile banner (blob ref)
bool    IsVendor         // seller flag
DateTimeOffset? LastSeen // set by PresenceService
```

---

### 0.2 MediaService (New)

**Responsibilities:** Centralized file upload, virus scan, resizing,
and CDN URL generation. All domain services delegate uploads here.

#### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/media/upload` | `POST` | Multipart upload → returns `{ mediaId, url, thumbnailUrl }` |
| `/media/{mediaId}` | `GET` | Media metadata |
| `/media/{mediaId}` | `DELETE` | Soft-delete (owner or admin only) |

#### Processing Pipeline

```
Client → POST /media/upload
       → Validate (size, MIME type whitelist)
       → Scan (ClamAV or Azure Defender)
       → Resize / transcode (image → WebP; video → HLS)
       → Upload to Azure Blob Storage
       → Store metadata (PostgreSQL)
       → Return CDN URL
```

#### Entity

```csharp
public class MediaAsset
{
    public Guid   Id            { get; set; }
    public Guid   UploadedBy    { get; set; }
    public string OriginalName  { get; set; }
    public string ContentType   { get; set; }
    public long   SizeBytes     { get; set; }
    public string BlobPath      { get; set; }   // internal path
    public string PublicUrl     { get; set; }   // CDN URL
    public string? ThumbnailUrl { get; set; }
    public string Category      { get; set; }   // avatar|attachment|post|theater|product
    public DateTimeOffset CreatedAt { get; set; }
    public bool   IsDeleted     { get; set; }
}
```

---

### 0.3 RealTimeHub (New)

**Responsibilities:** Singleton SignalR hub that acts as the real-time
gateway for all domains. Uses Redis as the SignalR backplane so the hub
scales horizontally.

#### Hub Groups Strategy

| Group Name Pattern | Members | Events |
|---|---|---|
| `user:{userId}` | Single user across devices | Personal notifications, calls, invites |
| `conversation:{conversationId}` | Conversation participants | Messages, typing, reactions |
| `presence:{userId}` | Friends/contacts of user | Presence updates |
| `theater:{theaterId}` | Theater viewers | Chat, playback sync, viewer count |
| `feed:{userId}` | Self | New feed items push |

#### Infrastructure

```csharp
// Program.cs (RealTimeHub)
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConnectionString, opts =>
    {
        opts.Configuration.ChannelPrefix = RedisChannel.Literal("sc-rt");
    });

builder.Services.AddAuthentication()
    .AddJwtBearer();   // service-to-service: domain services POST events
                       // client-facing: validated via BFF session cookie
```

#### Internal Event Injection API

Domain services publish events to the hub via an internal HTTP API
(not exposed publicly):

```
POST /internal/hub/publish
Body: { "group": "conversation:abc", "event": "message:new", "payload": {...} }
```

---

### 0.4 Service Conventions

All services must follow these conventions from Phase 0:

```
ServiceName/
├── Controllers/           # Minimal API endpoint groups or Controllers
├── Data/
│   ├── AppDbContext.cs
│   └── Entities.cs
├── Dtos/                  # Request/Response DTOs (not domain models)
├── Services/              # Business logic
├── Migrations/
├── Auth/                  # JWT validation middleware (service-to-service)
└── Properties/
    └── launchSettings.json
```

**Error shape (RFC 7807 Problem Details):**
```json
{
  "type": "https://socialcommerce.dev/errors/not-found",
  "title": "Resource not found",
  "status": 404,
  "detail": "Conversation 'abc' does not exist.",
  "traceId": "00-abc..."
}
```

**Standard response envelopes:** Use `TypedResults` in Minimal API or
`ActionResult<T>` in controllers. All list endpoints return:
```json
{
  "items": [...],
  "nextCursor": "cursor-token",
  "hasMore": true
}
```

---

## Phase 1 — Communication Backend

### Services: CommunicationService · PresenceService · SignalingService

---

### 1.1 CommunicationService

**Responsibilities:** Manage conversations (DMs and Rooms), messages,
reactions, attachments, pinned messages, and read receipts.

#### Database Schema

```
Conversations
  Id               uuid PK
  Type             varchar(4)  -- 'dm' | 'room'
  Name             varchar(100) nullable
  AvatarUrl        varchar(512) nullable
  CreatedAt        timestamptz
  CreatedBy        uuid FK → UserProfiles

ConversationParticipants
  ConversationId   uuid FK
  UserId           uuid FK
  Role             varchar(10) -- 'owner'|'admin'|'member'
  JoinedAt         timestamptz
  LastReadAt       timestamptz  -- for unread count calc
  PK (ConversationId, UserId)

Messages
  Id               uuid PK
  ConversationId   uuid FK
  SenderId         uuid FK
  Content          text
  ReplyToId        uuid FK nullable
  EditedAt         timestamptz nullable
  DeletedAt        timestamptz nullable
  CreatedAt        timestamptz

MessageAttachments
  Id               uuid PK
  MessageId        uuid FK
  MediaId          uuid FK → MediaAssets
  Type             varchar(10)  -- 'image'|'video'|'audio'|'file'

MessageReactions
  MessageId        uuid FK
  UserId           uuid FK
  Emoji            varchar(10)
  CreatedAt        timestamptz
  PK (MessageId, UserId, Emoji)

PinnedMessages
  ConversationId   uuid FK
  MessageId        uuid FK
  PinnedBy         uuid FK
  PinnedAt         timestamptz
  PK (ConversationId, MessageId)
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/conversations` | `GET` | List user's conversations (cursor-paged) |
| `/conversations` | `POST` | Create DM or Room |
| `/conversations/{id}` | `GET` | Conversation detail + participants |
| `/conversations/{id}` | `PATCH` | Update name/avatar (rooms) |
| `/conversations/{id}/participants` | `POST` | Add participant |
| `/conversations/{id}/participants/{userId}` | `DELETE` | Remove participant |
| `/conversations/{id}/messages` | `GET` | Messages (cursor-paged, newest-first) |
| `/conversations/{id}/messages` | `POST` | Send message |
| `/conversations/{id}/messages/{messageId}` | `PATCH` | Edit message |
| `/conversations/{id}/messages/{messageId}` | `DELETE` | Delete message |
| `/conversations/{id}/messages/{messageId}/reactions` | `POST` | Add reaction |
| `/conversations/{id}/messages/{messageId}/reactions/{emoji}` | `DELETE` | Remove reaction |
| `/conversations/{id}/messages/search` | `GET` | Full-text search within conversation |
| `/conversations/{id}/pins` | `GET` | Pinned messages |
| `/conversations/{id}/pins/{messageId}` | `PUT` | Pin message |
| `/conversations/{id}/pins/{messageId}` | `DELETE` | Unpin message |
| `/conversations/{id}/read` | `POST` | Mark conversation as read (updates `LastReadAt`) |

#### Real-Time Events (published to RealTimeHub)

| Event | Group | Payload |
|---|---|---|
| `message:new` | `conversation:{id}` | Full message DTO |
| `message:edit` | `conversation:{id}` | `{ messageId, content, editedAt }` |
| `message:delete` | `conversation:{id}` | `{ messageId }` |
| `message:reaction` | `conversation:{id}` | `{ messageId, emoji, userId, action }` |
| `conversation:created` | `user:{userId}` | Conversation DTO (sent to all participants) |

---

### 1.2 PresenceService

**Responsibilities:** Track and broadcast user online/offline/idle/DND
status. Last-seen timestamps. Typing indicators.

#### Design

- Presence state is stored in **Redis** (TTL-based heartbeats), not
  in PostgreSQL. Persistent last-seen written to UserService async.
- Heartbeat: client calls `POST /presence/heartbeat` every 30 s.
- If no heartbeat for 90 s → user marked `offline`.

#### Redis Keys

```
presence:{userId}         → "online"|"idle"|"dnd"  (TTL 90s)
typing:{conversationId}   → SET of userId  (TTL 5s)
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/presence/heartbeat` | `POST` | Body `{ status }` — refreshes TTL |
| `/presence/bulk` | `POST` | Body `{ userIds[] }` — batch presence lookup |
| `/presence/{userId}` | `GET` | Single user presence |

#### Real-Time Events

| Event | Group | Payload |
|---|---|---|
| `presence:update` | `presence:{userId}` | `{ userId, status, lastSeen }` |
| `typing:start` | `conversation:{id}` | `{ userId, conversationId }` |
| `typing:stop` | `conversation:{id}` | `{ userId, conversationId }` |

---

### 1.3 SignalingService

**Responsibilities:** WebRTC call session management and SDP/ICE
candidate relay. Does not handle media — media flows peer-to-peer via
WebRTC. Media server (e.g., mediasoup, Janus) added in Phase 6
hardening for group calls > 4 participants.

#### Database Schema

```
CallSessions
  Id               uuid PK
  Type             varchar(5)   -- 'voice'|'video'
  InitiatorId      uuid FK
  Status           varchar(10)  -- 'ringing'|'active'|'ended'
  ConversationId   uuid FK nullable
  StartedAt        timestamptz nullable
  EndedAt          timestamptz nullable
  CreatedAt        timestamptz

CallParticipants
  CallSessionId    uuid FK
  UserId           uuid FK
  IsMuted          boolean default false
  IsDeafened       boolean default false
  IsCameraOn       boolean default false
  IsScreenSharing  boolean default false
  JoinedAt         timestamptz
  LeftAt           timestamptz nullable
  PK (CallSessionId, UserId)
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/calls` | `POST` | Initiate a call → returns `CallSession` |
| `/calls/{callId}` | `GET` | Get call session |
| `/calls/{callId}/join` | `POST` | Join a call |
| `/calls/{callId}/leave` | `POST` | Leave / hang up |
| `/calls/{callId}/signal` | `POST` | Relay SDP offer/answer or ICE candidate |
| `/calls/{callId}/participants/{userId}/state` | `PATCH` | Update mute/camera state |

#### Real-Time Events

| Event | Group | Payload |
|---|---|---|
| `call:incoming` | `user:{userId}` | `CallSession` |
| `call:joined` | `conversation:{id}` | `CallParticipant` |
| `call:left` | `conversation:{id}` | `{ userId }` |
| `call:ended` | `conversation:{id}` | `{ callId }` |
| `call:signal` | `user:{targetUserId}` | `{ callId, type, sdp?, candidate? }` |
| `call:state_update` | `conversation:{id}` | `{ userId, isMuted, isCameraOn, ... }` |

---

## Phase 2 — Social Backend

### Services: SocialContentService · SocialGraphService · FeedService · ModerationService

> Four services already scaffolded. This phase defines their full
> feature contracts, data models, and API surfaces.

---

### 2.1 SocialContentService (Extend Existing)

**Responsibilities:** Posts, comments, reactions, polls, groups,
group rules, group membership.

#### Database Schema

```
Posts
  Id               uuid PK
  AuthorId         uuid FK
  GroupId          uuid FK nullable
  Type             varchar(5)  -- 'text'|'image'|'video'|'link'|'poll'
  Title            varchar(300)
  Body             text nullable
  LinkUrl          varchar(2048) nullable
  Upvotes          int default 0
  Downvotes        int default 0
  CommentCount     int default 0
  ShareCount       int default 0
  CreatedAt        timestamptz
  EditedAt         timestamptz nullable
  DeletedAt        timestamptz nullable

PostMedia
  PostId           uuid FK
  MediaId          uuid FK
  DisplayOrder     int

PostVotes
  PostId           uuid FK
  UserId           uuid FK
  Value            smallint  -- +1 or -1
  CreatedAt        timestamptz
  PK (PostId, UserId)

PostSaves
  PostId           uuid FK
  UserId           uuid FK
  PK (PostId, UserId)

Comments
  Id               uuid PK
  PostId           uuid FK
  ParentId         uuid FK nullable
  AuthorId         uuid FK
  Body             text
  Depth            smallint default 0   -- capped at e.g. 10
  Upvotes          int default 0
  Downvotes        int default 0
  ReplyCount       int default 0
  CreatedAt        timestamptz
  EditedAt         timestamptz nullable
  DeletedAt        timestamptz nullable

CommentVotes
  CommentId        uuid FK
  UserId           uuid FK
  Value            smallint
  PK (CommentId, UserId)

Polls
  Id               uuid PK
  PostId           uuid FK unique
  TotalVotes       int default 0
  EndsAt           timestamptz nullable

PollOptions
  Id               uuid PK
  PollId           uuid FK
  Label            varchar(200)
  Votes            int default 0
  DisplayOrder     int

PollVotes
  PollId           uuid FK
  UserId           uuid FK
  OptionId         uuid FK
  PK (PollId, UserId)

Groups
  Id               uuid PK
  Name             varchar(100)
  Slug             varchar(100) unique
  Description      text
  AvatarUrl        varchar(512) nullable
  BannerUrl        varchar(512) nullable
  Visibility       varchar(12)  -- 'public'|'private'|'restricted'
  MemberCount      int default 0
  CreatedBy        uuid FK
  CreatedAt        timestamptz

GroupMembers
  GroupId          uuid FK
  UserId           uuid FK
  Role             varchar(12)  -- 'owner'|'moderator'|'member'
  JoinedAt         timestamptz
  PK (GroupId, UserId)

GroupRules
  Id               uuid PK
  GroupId          uuid FK
  Title            varchar(200)
  Description      text
  DisplayOrder     int

GroupBans
  GroupId          uuid FK
  UserId           uuid FK
  BannedBy         uuid FK
  Reason           text nullable
  ExpiresAt        timestamptz nullable
  CreatedAt        timestamptz
  PK (GroupId, UserId)
```

#### API Endpoints (Posts)

| Endpoint | Method | Description |
|---|---|---|
| `/posts` | `POST` | Create post |
| `/posts/{postId}` | `GET` | Get post detail |
| `/posts/{postId}` | `PATCH` | Edit post (author only) |
| `/posts/{postId}` | `DELETE` | Delete post |
| `/posts/{postId}/vote` | `POST` | Upvote / downvote / remove vote |
| `/posts/{postId}/save` | `POST` | Save / unsave |
| `/posts/{postId}/comments` | `GET` | Top-level comments (cursor-paged) |
| `/posts/{postId}/comments` | `POST` | Add comment |
| `/comments/{commentId}/replies` | `GET` | Nested replies (cursor-paged) |
| `/comments/{commentId}` | `PATCH` | Edit comment |
| `/comments/{commentId}` | `DELETE` | Delete comment |
| `/comments/{commentId}/vote` | `POST` | Vote on comment |
| `/polls/{pollId}/vote` | `POST` | Cast poll vote |
| `/users/{userId}/posts` | `GET` | User wall — all posts by user |
| `/users/{userId}/saved` | `GET` | User's saved posts |

#### API Endpoints (Groups)

| Endpoint | Method | Description |
|---|---|---|
| `/groups` | `POST` | Create group |
| `/groups/{slug}` | `GET` | Group detail |
| `/groups/{slug}` | `PATCH` | Update group (owner/mod) |
| `/groups/{slug}/posts` | `GET` | Group feed (cursor-paged) |
| `/groups/{slug}/join` | `POST` | Join group |
| `/groups/{slug}/leave` | `POST` | Leave group |
| `/groups/{slug}/members` | `GET` | Member list |
| `/groups/{slug}/members/{userId}/role` | `PATCH` | Promote/demote member |
| `/groups/{slug}/ban/{userId}` | `POST` | Ban user |
| `/groups/{slug}/bans` | `GET` | Ban list |
| `/groups/{slug}/rules` | `GET` `PUT` | Get / replace rules |
| `/groups/discover` | `GET` | Browse/search public groups |
| `/moderation/queue` | `GET` | Pending moderation items (scoped to group) |
| `/moderation/{itemId}/approve` | `POST` | Approve item |
| `/moderation/{itemId}/remove` | `POST` | Remove item |

---

### 2.2 SocialGraphService (Extend Existing)

**Responsibilities:** Follow/unfollow, friend requests, mutual friends,
blocked users, follower/following counts.

#### Database Schema

```
Follows
  FollowerId       uuid FK
  FolloweeId       uuid FK
  CreatedAt        timestamptz
  PK (FollowerId, FolloweeId)

FriendRequests
  Id               uuid PK
  SenderId         uuid FK
  ReceiverId       uuid FK
  Status           varchar(10)  -- 'pending'|'accepted'|'declined'
  CreatedAt        timestamptz
  UpdatedAt        timestamptz

Blocks
  BlockerId        uuid FK
  BlockedId        uuid FK
  CreatedAt        timestamptz
  PK (BlockerId, BlockedId)
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/graph/follow/{userId}` | `POST` `DELETE` | Follow / unfollow |
| `/graph/following` | `GET` | Accounts the current user follows |
| `/graph/followers` | `GET` | Accounts following the current user |
| `/graph/friends` | `GET` | Mutual follows (friends) |
| `/graph/friend-requests` | `GET` | Pending incoming requests |
| `/graph/friend-requests/{userId}` | `POST` | Send friend request |
| `/graph/friend-requests/{requestId}/accept` | `POST` | Accept |
| `/graph/friend-requests/{requestId}/decline` | `POST` | Decline |
| `/graph/block/{userId}` | `POST` `DELETE` | Block / unblock |
| `/internal/graph/is-following` | `POST` | Bulk is-following check (for FeedService) |

---

### 2.3 FeedService (Extend Existing)

**Responsibilities:** Aggregate the home feed from followed users and
joined groups. Cursor-paginated, sort by Hot/New/Top. Fan-out on
write (push model) with Redis-backed feed lists per user.

#### Feed Strategy

```
Fan-out on Write:
  1. Author publishes post → SocialContentService
  2. SocialContentService emits Redis message: "post:published:{postId}"
  3. FeedService consumes → queries SocialGraphService for author's followers
  4. Inserts postId into each follower's feed list in Redis (ZADD score=timestamp)
  5. Caps feed list at 1000 items per user
  6. Fetch: GET /feed → ZREVRANGE from Redis → hydrate with post data
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/feed/home` | `GET` | Home feed (followed users + joined groups) |
| `/feed/explore` | `GET` | Trending / recommended feed |
| `/feed/group/{slug}` | `GET` | Group-scoped feed |

---

### 2.4 ModerationService (Extend Existing)

**Responsibilities:** Receive report submissions, maintain a moderation
queue, apply automated rules, and record moderation decisions.

#### Database Schema

```
Reports
  Id               uuid PK
  ReportedBy       uuid FK
  ContentType      varchar(10)  -- 'post'|'comment'|'message'|'user'
  ContentId        uuid
  Reason           varchar(50)
  Detail           text nullable
  Status           varchar(10)  -- 'open'|'reviewed'|'actioned'|'dismissed'
  ReviewedBy       uuid FK nullable
  CreatedAt        timestamptz
  ReviewedAt       timestamptz nullable

ModerationActions
  Id               uuid PK
  ReportId         uuid FK nullable
  ModeratorId      uuid FK
  TargetType       varchar(10)
  TargetId         uuid
  Action           varchar(20)  -- 'remove'|'warn'|'mute'|'ban'|'dismiss'
  Reason           text
  CreatedAt        timestamptz
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/reports` | `POST` | Submit report |
| `/moderation/queue` | `GET` | Open reports for a moderator |
| `/moderation/{reportId}/action` | `POST` | Apply moderation action |
| `/internal/moderation/auto-flag` | `POST` | AI moderation hook (Phase 8) |

---

## Phase 3 — Streaming Backend

### Service: StreamingService

**Responsibilities:** Theater lifecycle management, viewer tracking,
synchronized playback state, theater chat, emotes, and discovery.

#### Database Schema

```
Theaters
  Id               uuid PK
  HostId           uuid FK
  Title            varchar(200)
  Description      text nullable
  Category         varchar(100)
  Tags             text[]
  Visibility       varchar(10)  -- 'public'|'private'|'friends'
  Status           varchar(10)  -- 'created'|'scheduled'|'live'|'paused'|'ended'
  SourceType       varchar(15)  -- 'screen_share'|'media_upload'|'external_url'
  SourceUrl        varchar(2048) nullable
  SourceMediaId    uuid FK nullable
  ViewerCount      int default 0
  MaxViewers       int nullable
  ScheduledAt      timestamptz nullable
  StartedAt        timestamptz nullable
  EndedAt          timestamptz nullable
  CreatedAt        timestamptz

TheaterParticipants
  TheaterId        uuid FK
  UserId           uuid FK
  Role             varchar(12)  -- 'host'|'moderator'|'viewer'
  JoinedAt         timestamptz
  LeftAt           timestamptz nullable
  IsChatMuted      boolean default false
  PK (TheaterId, UserId)

TheaterChatMessages
  Id               uuid PK
  TheaterId        uuid FK
  SenderId         uuid FK
  Content          text
  CreatedAt        timestamptz
  IsDeleted        boolean default false

PlaybackState
  TheaterId        uuid PK  -- one record per theater
  PositionSeconds  float
  IsPlaying        boolean
  UpdatedAt        timestamptz

Emotes
  Id               uuid PK
  Code             varchar(50) unique
  ImageUrl         varchar(512)
  Category         varchar(10)  -- 'global'|'theater'
  TheaterId        uuid FK nullable
  CreatedBy        uuid FK
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/theaters` | `POST` | Create theater |
| `/theaters/{theaterId}` | `GET` | Theater detail |
| `/theaters/{theaterId}` | `PATCH` | Update title/description/tags |
| `/theaters/{theaterId}/start` | `POST` | Transition CREATED → LIVE |
| `/theaters/{theaterId}/pause` | `POST` | Transition LIVE → PAUSED |
| `/theaters/{theaterId}/resume` | `POST` | Transition PAUSED → LIVE |
| `/theaters/{theaterId}/end` | `POST` | Transition → ENDED |
| `/theaters/{theaterId}/join` | `POST` | Viewer joins theater |
| `/theaters/{theaterId}/leave` | `POST` | Viewer leaves |
| `/theaters/{theaterId}/playback` | `GET` | Current playback state |
| `/theaters/{theaterId}/playback` | `PUT` | Host updates playback (position, isPlaying) |
| `/theaters/{theaterId}/chat` | `GET` | Chat history (cursor-paged) |
| `/theaters/{theaterId}/chat` | `POST` | Send chat message |
| `/theaters/{theaterId}/chat/{messageId}` | `DELETE` | Delete chat message (mod/host) |
| `/theaters/{theaterId}/participants` | `GET` | Viewer list |
| `/theaters/{theaterId}/participants/{userId}/mute-chat` | `POST` | Mute viewer chat |
| `/theaters/{theaterId}/invite` | `POST` | Send theater invite to user |
| `/theaters/discover` | `GET` | Browse live/upcoming (filtered, sorted) |
| `/theaters/discover/search` | `GET` | Full-text theater search |
| `/emotes` | `GET` | Global emotes |
| `/theaters/{theaterId}/emotes` | `GET` `POST` | Theater emotes |

#### Theater Lifecycle State Machine

```
CREATED ──[host starts]──▶ LIVE ──[host pauses]──▶ PAUSED
                            ▲                         │
                            └────[host resumes]───────┘
                            │
                         [host ends]
                            ▼
                          ENDED
```

#### Real-Time Events

| Event | Group | Payload |
|---|---|---|
| `theater:status` | `theater:{id}` | `{ theaterId, status }` |
| `theater:viewer_joined` | `theater:{id}` | `TheaterParticipant` |
| `theater:viewer_left` | `theater:{id}` | `{ userId }` |
| `theater:viewer_count` | `theater:{id}` | `{ count }` |
| `theater:chat_message` | `theater:{id}` | `TheaterChatMessage` |
| `theater:chat_delete` | `theater:{id}` | `{ messageId }` |
| `theater:playback_sync` | `theater:{id}` | `{ positionSeconds, isPlaying, serverTime }` |
| `theater:invite` | `user:{userId}` | `{ theaterId, title, inviterName }` |

#### Playback Sync Strategy

```
Host sends PUT /theaters/{id}/playback { positionSeconds, isPlaying }
  → StreamingService persists to PlaybackState table
  → Publishes theater:playback_sync to RealTimeHub
  → All viewers receive position + server timestamp
  → Client adjusts local player position accounting for latency:
      adjustedPosition = positionSeconds + (Date.now() - serverTime) / 1000
```

---

## Phase 4 — E-Commerce Buyer Backend

### Services: CommerceService · OrderService

---

### 4.1 CommerceService

**Responsibilities:** Product catalog, categories, search, vendor info,
product variants, reviews and ratings, shopping cart.

#### Database Schema

```
Categories
  Id               uuid PK
  Name             varchar(100)
  Slug             varchar(100) unique
  ParentId         uuid FK nullable
  DisplayOrder     int

Products
  Id               uuid PK
  VendorId         uuid FK → Shops
  Title            varchar(300)
  Description      text
  CategoryId       uuid FK
  AverageRating    decimal(3,2) default 0
  ReviewCount      int default 0
  Availability     varchar(12)  -- 'in_stock'|'low_stock'|'out_of_stock'
  Status           varchar(10)  -- 'draft'|'active'|'archived'
  Tags             text[]
  CreatedAt        timestamptz
  UpdatedAt        timestamptz

ProductImages
  Id               uuid PK
  ProductId        uuid FK
  MediaId          uuid FK → MediaAssets
  AltText          varchar(300)
  DisplayOrder     int

ProductVariants
  Id               uuid PK
  ProductId        uuid FK
  Label            varchar(200)   -- "Red / Large"
  Sku              varchar(100) unique
  PriceCents       bigint
  Currency         varchar(3)
  Stock            int default 0
  Attributes       jsonb          -- { "color": "Red", "size": "L" }

Carts
  Id               uuid PK
  UserId           uuid FK unique  -- one active cart per user
  CouponCode       varchar(50) nullable
  CreatedAt        timestamptz
  UpdatedAt        timestamptz

CartItems
  Id               uuid PK
  CartId           uuid FK
  ProductId        uuid FK
  VariantId        uuid FK
  Quantity         int
  AddedAt          timestamptz

Coupons
  Code             varchar(50) PK
  DiscountType     varchar(10)  -- 'percent'|'fixed'
  DiscountValue    decimal(10,2)
  MinOrderCents    bigint nullable
  ExpiresAt        timestamptz nullable
  MaxUses          int nullable
  UsedCount        int default 0
  IsActive         boolean default true

Reviews
  Id               uuid PK
  ProductId        uuid FK
  AuthorId         uuid FK
  OrderItemId      uuid FK nullable   -- verified purchase link
  Rating           smallint           -- 1–5
  Title            varchar(200)
  Body             text
  HelpfulCount     int default 0
  CreatedAt        timestamptz
  UpdatedAt        timestamptz

ReviewImages
  ReviewId         uuid FK
  MediaId          uuid FK

ReviewHelpful
  ReviewId         uuid FK
  UserId           uuid FK
  PK (ReviewId, UserId)
```

#### API Endpoints (Catalog)

| Endpoint | Method | Description |
|---|---|---|
| `/categories` | `GET` | Category tree |
| `/products` | `GET` | Browse products (filter, sort, paginate) |
| `/products/{productId}` | `GET` | Product detail with variants |
| `/products/{productId}/reviews` | `GET` | Reviews (sorted, paged) |
| `/products/{productId}/reviews` | `POST` | Submit review (verified purchase optional) |
| `/reviews/{reviewId}/helpful` | `POST` `DELETE` | Mark helpful / remove |
| `/products/search` | `GET` | Full-text product search |
| `/products/related/{productId}` | `GET` | Related products |

#### API Endpoints (Cart)

| Endpoint | Method | Description |
|---|---|---|
| `/cart` | `GET` | Get current user's cart |
| `/cart/items` | `POST` | Add item to cart |
| `/cart/items/{itemId}` | `PATCH` | Update quantity |
| `/cart/items/{itemId}` | `DELETE` | Remove item |
| `/cart/coupon` | `POST` | Apply coupon code |
| `/cart/coupon` | `DELETE` | Remove coupon |

---

### 4.2 OrderService

**Responsibilities:** Checkout session management, payment processing
integration, order placement, status tracking, order history.

#### Database Schema

```
Addresses
  Id               uuid PK
  UserId           uuid FK
  Line1            varchar(200)
  Line2            varchar(200) nullable
  City             varchar(100)
  State            varchar(100)
  PostalCode       varchar(20)
  Country          varchar(3)   -- ISO 3166-1 alpha-2
  IsDefault        boolean default false

Orders
  Id               uuid PK
  BuyerId          uuid FK
  Status           varchar(15)  -- 'pending'|'confirmed'|'shipped'|'delivered'|'cancelled'|'refunded'
  ShippingAddressId uuid FK
  PaymentRef       varchar(200)  -- payment provider reference
  SubtotalCents    bigint
  ShippingCents    bigint
  TaxCents         bigint
  TotalCents       bigint
  Currency         varchar(3)
  CouponCode       varchar(50) nullable
  DiscountCents    bigint default 0
  PlacedAt         timestamptz
  UpdatedAt        timestamptz

OrderItems
  Id               uuid PK
  OrderId          uuid FK
  ProductId        uuid FK
  VariantId        uuid FK
  VendorId         uuid FK
  Quantity         int
  UnitPriceCents   bigint
  Currency         varchar(3)

Shipments
  Id               uuid PK
  OrderId          uuid FK
  Carrier          varchar(100)
  TrackingNumber   varchar(200)
  Status           varchar(15)
  EstimatedDelivery date nullable
  ShippedAt        timestamptz nullable
  DeliveredAt      timestamptz nullable
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/checkout/session` | `POST` | Start checkout — locks cart, returns session |
| `/checkout/session/{sessionId}/address` | `PUT` | Set shipping address |
| `/checkout/session/{sessionId}/payment` | `PUT` | Attach payment method token |
| `/checkout/session/{sessionId}/review` | `GET` | Order preview (totals, tax) |
| `/checkout/session/{sessionId}/place` | `POST` | Place order → payment charge → Order created |
| `/orders` | `GET` | Order history (cursor-paged) |
| `/orders/{orderId}` | `GET` | Order detail |
| `/orders/{orderId}/tracking` | `GET` | Shipment tracking |
| `/orders/{orderId}/cancel` | `POST` | Cancel (if status is `pending`) |
| `/addresses` | `GET` `POST` | List / add saved addresses |
| `/addresses/{addressId}` | `PATCH` `DELETE` | Update / remove |

#### Checkout State Machine

```
CART ──▶ CHECKOUT_SESSION
           ├─ SET_ADDRESS
           ├─ SET_PAYMENT
           ├─ REVIEW
           └─ PLACE_ORDER ──▶ PAYMENT_CHARGE
                                  │ success         │ failure
                                  ▼                 ▼
                             ORDER_PLACED    PAYMENT_ERROR
                                  │               │
                             (emit event)     (return to
                                  │           PAYMENT step)
                                  ▼
                           emit order:placed → OrderService
                                             → InventoryService (decrement stock)
                                             → NotificationService
                                             → FeedService / Analytics
```

#### Payment Integration

Payment provider (e.g., Stripe) integration via **payment intents**.
The backend never handles raw card numbers — only tokenized payment
method IDs from the frontend SDK.

```
POST /checkout/session/{sessionId}/place
  → Create Stripe PaymentIntent (or confirm existing)
  → On success: create Order record, clear Cart, emit order:placed
  → On failure: return 402 Payment Required with Stripe error code
```

---

## Phase 5 — E-Commerce Seller Backend

### Services: InventoryService · AnalyticsService · AdService

---

### 5.1 InventoryService

**Responsibilities:** Shop management, product lifecycle (draft →
active → archived), variant stock management, bulk import/export,
low-stock alerts, incoming order fulfillment updates.

#### Database Schema

```
Shops
  Id               uuid PK
  OwnerId          uuid FK
  Name             varchar(100)
  Slug             varchar(100) unique
  Description      text
  LogoUrl          varchar(512) nullable
  BannerUrl        varchar(512) nullable
  ReturnPolicy     text nullable
  ShippingPolicy   text nullable
  ContactEmail     varchar(320) nullable
  AverageRating    decimal(3,2) default 0
  ProductCount     int default 0
  CreatedAt        timestamptz

InventorySnapshots
  VariantId        uuid FK → ProductVariants
  Stock            int
  LowStockThreshold int default 5
  LastRestockedAt  timestamptz nullable
  UpdatedAt        timestamptz
  PK (VariantId)

SellerOrders
  OrderId          uuid FK PK   -- mirror from OrderService
  SellerId         uuid FK
  Status           varchar(15)
  BuyerName        varchar(200)
  TotalCents       bigint
  PlacedAt         timestamptz
  UpdatedAt        timestamptz
```

#### API Endpoints (Shop)

| Endpoint | Method | Description |
|---|---|---|
| `/shops/mine` | `GET` | Get authenticated seller's shop |
| `/shops` | `POST` | Create shop (becomes vendor) |
| `/shops/mine` | `PATCH` | Update shop details/policies |
| `/shops/{slug}` | `GET` | Public shop page |

#### API Endpoints (Inventory / Products)

| Endpoint | Method | Description |
|---|---|---|
| `/inventory/products` | `GET` | All seller products (with status filter) |
| `/inventory/products` | `POST` | Create product |
| `/inventory/products/{productId}` | `GET` `PATCH` `DELETE` | Manage product |
| `/inventory/products/{productId}/status` | `PATCH` | Change status (draft/active/archived) |
| `/inventory/products/{productId}/variants` | `GET` `POST` | List / add variants |
| `/inventory/variants/{variantId}` | `PATCH` | Update variant (price, stock) |
| `/inventory/variants/{variantId}` | `DELETE` | Remove variant |
| `/inventory/low-stock` | `GET` | Products at or below threshold |
| `/inventory/import` | `POST` | CSV bulk product import |
| `/inventory/export` | `GET` | CSV export of all products |

#### API Endpoints (Seller Orders)

| Endpoint | Method | Description |
|---|---|---|
| `/seller/orders` | `GET` | Incoming orders (cursor-paged, status filter) |
| `/seller/orders/{orderId}` | `GET` | Order detail |
| `/seller/orders/{orderId}/status` | `PATCH` | Update status (confirmed/shipped/delivered) |
| `/seller/orders/{orderId}/refund` | `POST` | Initiate refund |

---

### 5.2 AnalyticsService

**Responsibilities:** Aggregate seller sales data from OrderService
events. Serve revenue charts, top products, conversion rates.

#### Design

- Consumes `order:placed` and `order:updated` events from Redis
  pub/sub / message broker.
- Pre-aggregates daily summaries into `SalesSummaries` table.
- API returns on-demand aggregations for arbitrary date ranges.

#### Database Schema

```
SalesSummaries
  ShopId           uuid FK
  Date             date
  Revenue          bigint          -- cents
  OrderCount       int
  UnitsSold        int
  PK (ShopId, Date)

ProductSalesSummaries
  ShopId           uuid FK
  ProductId        uuid FK
  Date             date
  UnitsSold        int
  Revenue          bigint
  PK (ShopId, ProductId, Date)
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/analytics/overview` | `GET` | KPI cards (revenue, orders, units, conversion) |
| `/analytics/revenue` | `GET` | Revenue over time (daily/weekly/monthly, date range) |
| `/analytics/top-products` | `GET` | Top N products by revenue or units |
| `/analytics/orders` | `GET` | Order volume over time |
| `/analytics/export` | `GET` | Export CSV or PDF report |

---

### 5.3 AdService

**Responsibilities:** Create and manage product ad campaigns.
Track impressions, clicks, and conversions. Apply budget limits.

#### Database Schema

```
AdCampaigns
  Id               uuid PK
  ShopId           uuid FK
  Name             varchar(200)
  Status           varchar(10)  -- 'draft'|'active'|'paused'|'ended'
  BudgetCents      bigint
  SpentCents       bigint default 0
  StartDate        date
  EndDate          date
  CreatedAt        timestamptz

CampaignProducts
  CampaignId       uuid FK
  ProductId        uuid FK
  PK (CampaignId, ProductId)

CampaignMetrics
  CampaignId       uuid FK PK
  Impressions      bigint default 0
  Clicks           bigint default 0
  Conversions      bigint default 0
  UpdatedAt        timestamptz
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/ads/campaigns` | `GET` `POST` | List / create campaigns |
| `/ads/campaigns/{campaignId}` | `GET` `PATCH` `DELETE` | Manage campaign |
| `/ads/campaigns/{campaignId}/pause` | `POST` | Pause active campaign |
| `/ads/campaigns/{campaignId}/resume` | `POST` | Resume paused campaign |
| `/ads/campaigns/{campaignId}/metrics` | `GET` | Performance metrics |
| `/internal/ads/record-impression` | `POST` | Called by FeedService on product display |
| `/internal/ads/record-click` | `POST` | Called when user clicks ad |

---

## Phase 6 — Hardening

### Security

| Area | Strategy |
|---|---|
| **Auth** | Rotate refresh tokens on each use. Short-lived access tokens (15 min). Revocation list in Redis. |
| **HTTPS** | TLS termination at load balancer/ingress. HSTS headers. |
| **CORS** | Strict origin allowlist per service. No wildcard in production. |
| **Rate Limiting** | ASP.NET Core `RateLimiter` middleware per endpoint category. Separate limits for auth, API, and upload. |
| **Input Validation** | FluentValidation on all DTOs. Max field lengths enforced at DB and API layers. |
| **SQL Injection** | EF Core parameterized queries only. Raw SQL only through `FromSqlRaw` with parameters. |
| **CSRF** | Double-submit cookie on all state-changing BFF endpoints. |
| **Secrets** | No secrets in code or environment variables in production. Use Azure Key Vault / Kubernetes Secrets. |
| **Dependency Scanning** | `dotnet list package --vulnerable` in CI. Dependabot alerts. |

### Performance

| Area | Strategy |
|---|---|
| **DB Indexes** | Index all FK columns, `CreatedAt` DESC for pagination, full-text index on searchable fields. |
| **Query Optimization** | Use `AsNoTracking()` for read-only queries. Projection with `Select()` instead of loading full entities. Avoid N+1 with `Include()` or batched lookups. |
| **Caching** | Redis cache for: feed lists, presence state, product catalog (with short TTL), cart sessions. |
| **Connection Pooling** | Npgsql connection pool tuned per service workload. PgBouncer for high-concurrency services. |
| **Async** | All I/O operations `async/await`. No blocking calls on thread pool threads. |
| **Background Jobs** | Hangfire or .NET `IHostedService` for: feed fan-out, analytics aggregation, low-stock alerts, report generation. |
| **Pagination** | Cursor-based pagination on all list endpoints. Never `OFFSET` on large tables. |

### Observability

| Concern | Tool |
|---|---|
| **Structured Logging** | Serilog → Azure Monitor / Elastic |
| **Distributed Tracing** | OpenTelemetry → Jaeger / Azure Monitor |
| **Metrics** | `dotnet-counters`, Prometheus exporter → Grafana |
| **Health Checks** | `IHealthCheck` on `/health/live` and `/health/ready` per service |
| **Error Tracking** | Sentry or Azure Application Insights |
| **Alerts** | CPU, memory, error rate, DB connection pool saturation |

### Error Handling Conventions

```csharp
// Global exception handler (Program.cs)
app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async ctx =>
    {
        var problemDetails = ctx.RequestServices
            .GetRequiredService<IProblemDetailsService>();
        // Map DomainException → 422, NotFoundException → 404, etc.
        await problemDetails.WriteAsync(new() { HttpContext = ctx });
    });
});
```

Domain exception hierarchy:
```
AppException (base)
  ├── NotFoundException       → 404
  ├── ForbiddenException      → 403
  ├── ValidationException     → 422
  ├── ConflictException       → 409
  └── PaymentException        → 402
```

---

## Phase 7 — Integration & Cross-Domain

### 7.1 NotificationService

**Responsibilities:** Aggregate domain events from all services into a
unified notification stream per user. Persist notifications, mark as
read, badge count via real-time push.

#### Database Schema

```
Notifications
  Id               uuid PK
  UserId           uuid FK
  Type             varchar(50)   -- 'message:new'|'post:reply'|'order:update'|...
  Domain           varchar(15)   -- 'communication'|'social'|'streaming'|'commerce'
  Title            varchar(200)
  Body             text
  ActionUrl        varchar(512)  -- deep link
  IsRead           boolean default false
  CreatedAt        timestamptz
```

#### Event Subscriptions (Redis Pub/Sub channels)

| Channel | Published By | Notification Produced |
|---|---|---|
| `evt:message:new` | CommunicationService | New message |
| `evt:call:incoming` | SignalingService | Incoming call |
| `evt:friend:request` | SocialGraphService | Friend request |
| `evt:post:reply` | SocialContentService | Reply on post |
| `evt:post:mention` | SocialContentService | `@mention` in post/comment |
| `evt:group:invite` | SocialContentService | Group invite |
| `evt:theater:invite` | StreamingService | Theater invite |
| `evt:theater:live` | StreamingService | Followed user went live |
| `evt:order:update` | OrderService | Order status changed |

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/notifications` | `GET` | List notifications (cursor-paged) |
| `/notifications/unread-count` | `GET` | Badge count |
| `/notifications/{id}/read` | `POST` | Mark single as read |
| `/notifications/read-all` | `POST` | Mark all as read |

#### Real-Time Events

| Event | Group | Payload |
|---|---|---|
| `notification:new` | `user:{userId}` | `Notification` |
| `notification:badge` | `user:{userId}` | `{ unreadCount }` |

---

### 7.2 SearchService

**Responsibilities:** Unified search across all domains — users, posts,
groups, theaters, products.

#### Design

- Phase 7 (dev): PostgreSQL full-text search with `tsvector` per
  content type.
- Phase 8 (prod): Elasticsearch / Azure AI Search with semantic search.

#### Indexes

```
SearchIndex (PostgreSQL view or materialized view)
  EntityType    varchar(15)   -- 'user'|'post'|'group'|'theater'|'product'
  EntityId      uuid
  Title         text
  Body          text
  SearchVector  tsvector      -- auto-updated trigger
  DomainData    jsonb         -- type-specific fields (avatarUrl, price, etc.)
  UpdatedAt     timestamptz
```

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/search` | `GET` | `?q=&type=&page=` — unified search |
| `/search/users` | `GET` | User search |
| `/search/posts` | `GET` | Post search |
| `/search/groups` | `GET` | Group search |
| `/search/theaters` | `GET` | Theater search |
| `/search/products` | `GET` | Product search |

---

### 7.3 Event Bus Architecture

All cross-domain events are published to Redis pub/sub channels in
development and to **Azure Service Bus topics** in production.

```
Publisher (any service)
  → RedisPublisher.PublishAsync("evt:order:placed", payload)

Subscriber (e.g., NotificationService)
  → IHostedService subscribes on startup
  → Processes events with retry + dead-letter

Event envelope:
{
  "id":        "uuid",
  "type":      "evt:order:placed",
  "source":    "OrderService",
  "timestamp": "2025-10-01T12:00:00Z",
  "data":      { ... }
}
```

---

## Phase 8 — Advanced Features

### 8.1 AI Moderation

Integrate AI content classification into the ModerationService pipeline.

```
POST /internal/moderation/auto-flag
  → Forward text content to AI endpoint (Azure AI Content Safety or custom model)
  → Score returned: { hate, sexual, violence, selfHarm } (0–6 severity)
  → If any score ≥ threshold → auto-flag report → moderation queue
  → If score ≥ hard limit → auto-remove + notify user
```

---

### 8.2 Personalized Recommendations

A **RecommendationService** subscribes to user activity events
(views, clicks, purchases, follows) and builds per-user recommendation
lists stored in Redis.

| Feature | Method |
|---|---|
| Feed ranking | Collaborative filtering (user-item matrix) |
| Product recommendations | Item-based similarity + purchase history |
| "People you may know" | Graph distance (SocialGraphService) + shared groups |
| Theater discovery | Tag / category similarity + friends watching |

---

### 8.3 Feature Flags

Integrate **LaunchDarkly SDK** (or custom feature flag service) into
all ASP.NET Core services:

```csharp
// Usage in any service
if (await featureFlags.IsEnabledAsync("ai-moderation", userId))
    await moderationService.AutoFlagAsync(content);
```

Feature flag service API mirrors the frontend contract — same flag keys
evaluated server-side and client-side for consistency.

---

### 8.4 Telemetry Event Catalog

All domain-significant user actions emit structured telemetry events
(OpenTelemetry custom spans or events):

| Domain | Event | Properties |
|---|---|---|
| Communication | `message.sent` | `conversationId`, `type`, `hasAttachment` |
| Communication | `call.started` | `callType`, `participantCount` |
| Social | `post.created` | `postType`, `groupId?` |
| Social | `vote.cast` | `contentType`, `value` |
| Streaming | `theater.joined` | `theaterId`, `visibility` |
| Streaming | `theater.created` | `sourceType`, `visibility` |
| Commerce | `product.viewed` | `productId`, `categoryId` |
| Commerce | `cart.item_added` | `productId`, `variantId` |
| Commerce | `order.placed` | `itemCount`, `totalCents` |

---

## Infrastructure

### docker-compose.yml (Planned Additions)

```yaml
  # Extend existing compose with planned services
  communicationservice:
    build: ./services/CommunicationService
    ports: [ "5008:8080" ]
    depends_on: [ postgres, redis ]

  presenceservice:
    build: ./services/PresenceService
    ports: [ "5009:8080" ]
    depends_on: [ redis ]

  signalingservice:
    build: ./services/SignalingService
    ports: [ "5010:8080" ]
    depends_on: [ postgres, redis ]

  realtimehub:
    build: ./services/RealTimeHub
    ports: [ "5007:8080" ]
    depends_on: [ redis ]

  streamingservice:
    build: ./services/StreamingService
    ports: [ "5011:8080" ]
    depends_on: [ postgres, redis ]

  commerceservice:
    build: ./services/CommerceService
    ports: [ "5012:8080" ]
    depends_on: [ postgres, redis ]

  orderservice:
    build: ./services/OrderService
    ports: [ "5013:8080" ]
    depends_on: [ postgres, redis ]

  inventoryservice:
    build: ./services/InventoryService
    ports: [ "5014:8080" ]
    depends_on: [ postgres, redis ]

  notificationservice:
    build: ./services/NotificationService
    ports: [ "5017:8080" ]
    depends_on: [ postgres, redis ]
```

### Per-Service Project Template

Each new service follows the same structure as UserService:

```
services/{ServiceName}/
├── {ServiceName}.csproj
├── Program.cs
├── Dockerfile
├── appsettings.json
├── appsettings.Development.json
├── Controllers/              # or Endpoints/ for Minimal API
├── Data/
│   ├── AppDbContext.cs
│   └── Entities.cs
├── Dtos/
├── Services/
├── Auth/
│   └── JwtAuthExtensions.cs  # service-to-service JWT
├── Migrations/
└── Properties/
    └── launchSettings.json
```

### Database Isolation

Each service owns its own PostgreSQL **database** (not just schema) in
production. In development, separate databases on the shared `pg`
container are acceptable:

| Service | Database Name |
|---|---|
| UserService | `user_db` |
| CommunicationService | `communication_db` |
| SocialContentService | `social_content_db` |
| SocialGraphService | `social_graph_db` |
| FeedService | `feed_db` |
| ModerationService | `moderation_db` |
| StreamingService | `streaming_db` |
| CommerceService | `commerce_db` |
| OrderService | `order_db` |
| InventoryService | `inventory_db` |
| NotificationService | `notification_db` |

---

## End of Document
