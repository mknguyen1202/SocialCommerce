# SocialCommerce

A full-stack **super app** combining social networking and e-commerce, built with a microservices architecture.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite |
| **Backend** | ASP.NET Core (.NET 8), C# |
| **Database** | PostgreSQL 16 (per-service schema isolation) |
| **Cache / Pub-Sub** | Redis 7 |
| **Real-Time** | ASP.NET Core SignalR |
| **Auth** | Cookie-based BFF session + JWT (service-to-service) |
| **ORM** | Entity Framework Core |
| **Object Storage** | Azure Blob Storage |
| **Containerization** | Docker Compose (dev) |

## Services

| Service | Port | Description |
|---|---|---|
| UserService | 5001 | Auth, profiles, BFF gateway |
| SocialGraphService | 5002 | Follows, friends, connections |
| SocialContentService | 5003 | Posts, comments, reactions |
| FeedService | 5004 | Personalized activity feeds |
| ModerationService | 5005 | Content moderation |
| MediaService | 5006 | File uploads, media processing |
| RealTimeHub | 5007 | SignalR WebSocket hub |
| CommunicationService | 5008 | Messaging and chat |
| PresenceService | 5009 | Online presence tracking |
| SignalingService | 5010 | WebRTC signaling |
| StreamingService | 5011 | Live streaming |
| CommerceService | 5012 | Product listings, storefront |
| OrderService | 5013 | Order management |
| InventoryService | 5014 | Stock and inventory |
| AnalyticsService | 5015 | Usage analytics |
| AdService | 5016 | Advertising platform |
| NotificationService | 5017 | Push and in-app notifications |
| SearchService | 5018 | Full-text and semantic search |

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)

### Run with Docker Compose

```bash
cp .env.example .env
# Fill in required values in .env (e.g. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

docker compose up --build
```

The UserService (BFF gateway) will be available at `http://localhost:5001`.

### Frontend (dev server)

```bash
cd socialcommerce
npm install
npm run dev
```

The React app will be available at `http://localhost:5173`.

### Run Backend Tests

```bash
dotnet test
```

## Project Structure

```
services/          # ASP.NET Core microservices
shared/Contracts/  # Shared DTOs and interfaces
socialcommerce/    # React + TypeScript frontend
doc/               # Architecture and design docs
scripts/           # Azure deployment scripts
docker-compose.yml # Local dev orchestration
```

## Documentation

- [Backend Strategy](doc/backend_superapp_strategy.md)
- [Frontend Strategy](doc/react_superapp_strategy_with_ai.md)
- [Architecture Overview](doc/high_level_dataflow_architecture.md)
- [Testing Strategy](doc/testing-strategy.md)
- [Azure Setup Guide](doc/azure-setup-guide.md)
- [CI/CD Pipeline](doc/CICD/pipeline-overview.md)
