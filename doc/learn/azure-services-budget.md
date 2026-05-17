# Azure Services for SocialCommerce — $15/month Personal Budget

> **Honest upfront**: 18 microservices + PostgreSQL + Redis + Blob Storage cannot
> all run simultaneously on fully managed Azure services for $15/month. This document
> shows the realistic path to a working personal/portfolio deployment within budget.

---

## Table of Contents

1. [The Budget Reality](#1-the-budget-reality)
2. [Your Infrastructure Needs](#2-your-infrastructure-needs)
3. [Azure Services — What to Buy](#3-azure-services--what-to-buy)
4. [Monthly Cost Breakdown](#4-monthly-cost-breakdown)
5. [Free Tiers to Claim](#5-free-tiers-to-claim)
6. [What NOT to Buy](#6-what-not-to-buy)
7. [Deployment Strategy](#7-deployment-strategy)
8. [The One Trick That Makes $15 Work](#8-the-one-trick-that-makes-15-work)
9. [Resource Naming and Region](#9-resource-naming-and-region)
10. [Quick Setup Order](#10-quick-setup-order)

---

## 1. The Budget Reality

The **single biggest cost** in this stack is the managed PostgreSQL server.
Everything else is cheap or free at personal-project scale.

| Scenario | PostgreSQL | ACA | All others | Monthly total |
|---|---|---|---|---|
| Everything managed, always-on | ~$16 | ~$2 | ~$0.50 | **~$18.50** |
| PostgreSQL stopped 16 hrs/day | ~$8 | ~$2 | ~$0.50 | **~$10.50** |
| PostgreSQL stopped 20 hrs/day | ~$5 | ~$1 | ~$0.50 | **~$6.50** |
| External free PostgreSQL (Neon.tech) | $0 | ~$1 | ~$0.50 | **~$1.50** |

The recommended approach: **Azure Container Apps (scale-to-zero) + PostgreSQL
Flexible Server (stop when not developing)**.

---

## 2. Your Infrastructure Needs

Mapping every service from docker-compose.yml to its infrastructure dependency:

| Service | PostgreSQL DB | Redis | Blob Storage | Service Bus | SignalR |
|---|---|---|---|---|---|
| UserService | user_db | — | via MediaService | — | — |
| MediaService | media_db | — | Yes (AzureStorage) | — | — |
| RealTimeHub | — | Yes backplane | — | — | optional |
| SocialGraphService | social_graph | — | — | Yes social-events | — |
| SocialContentService | social_content | — | — | Yes social-events | — |
| FeedService | feed | Yes cache | — | — | — |
| ModerationService | moderation_db | Yes | — | — | — |
| CommunicationService | communication_db | — | — | — | RealTimeHub |
| PresenceService | — | Yes TTL keys | — | — | RealTimeHub |
| SignalingService | signaling_db | — | — | — | RealTimeHub |
| InventoryService | inventory_db | — | — | — | — |
| AnalyticsService | analytics_db | Yes | — | — | — |
| AdService | ad_db | — | — | — | — |
| OrderService | order_db | — | — | — | — |
| CommerceService | commerce_db | — | — | — | — |
| NotificationService | notification_db | Yes | — | — | RealTimeHub |
| StreamingService | — | — | — | — | RealTimeHub |
| SearchService | search_db | — | — | — | — |
| AuthorizationService | — | — | — | — | — |
| React SPA | — | — | — | — | — |

**Key insight**: all 18 databases share a **single PostgreSQL server** using
separate database names — exactly what docker-compose.yml already does locally.

---

## 3. Azure Services — What to Buy

### 3a. Azure Container Apps — hosts all 18 microservices

**Tier**: Consumption plan (pay-per-use, scale-to-zero)

The consumption plan has a free monthly grant per subscription:
- 180,000 vCPU-seconds free
- 360,000 GiB-seconds free

With minReplicas: 0 on every container app, services consume zero compute when
idle. Cold start is 5-30 seconds for .NET, acceptable for a personal portfolio.

**Pricing after free tier (East US)**:

| Meter | Unit | Price |
|---|---|---|
| Active vCPU | per second | $0.000024 |
| Active memory | per GiB-second | $0.000003 |
| Idle vCPU | per second | $0.000003 |

Personal-use estimate (you are the only user, ~30 min active/day):

    6 services x 0.25 vCPU x 1,800 s x 30 days = 81,000 vCPU-seconds
    within the 180,000 free grant = $0/month

**Cost**: ~$0-2/month

---

### 3b. Azure Database for PostgreSQL Flexible Server — one shared DB

**Tier**: Burstable B1ms (1 vCore, 2 GB RAM)

All 18 service databases live on this one server as separate PostgreSQL
databases, mirroring the current docker-compose.yml setup.

**Pricing (East US, pay-as-you-go)**:

| Component | Price |
|---|---|
| Compute B1ms | ~$0.017/hour (~$12.41/month at 730 hours) |
| Storage | ~$0.115/GB/month x 32 GB minimum = ~$3.68/month |

Storage billing continues even when the server is stopped.
See Section 8 for the stop/start cost reduction strategy.

**Cost**: ~$6-16/month depending on how long the server is left running.

---

### 3c. Azure Blob Storage — media uploads

MediaService/appsettings.json already has the AzureStorage block wired up
(ConnectionString, Container, CdnBase). Create one storage account and one
container named "media".

**Tier**: General Purpose v2, Hot LRS

**Pricing (East US)**:

| Meter | Price |
|---|---|
| Storage (first 50 TB) | $0.0208/GB/month |
| Write operations | $0.05 per 10,000 |
| Read operations | $0.004 per 10,000 |

Personal estimate: 5 GB media = $0.10/month storage + negligible operations.

**Cost**: ~$0.20/month

---

### 3d. Azure Service Bus — event bus

SocialGraphService and SocialContentService both publish to social-events
via IBusPublisher (user.followed, friend.request.sent, etc.).

**Tier**: Basic (~$0.05 per million operations, minimum ~$0.10/month)

Basic tier supports queues and topics. Sufficient for personal learning.

Note: if you later need topic subscription filters or message sessions,
upgrade to Standard (~$10/month). Basic is enough for now.

**Cost**: ~$0.10/month

---

### 3e. Azure Static Web Apps — React SPA

The socialcommerce/ React/Vite app (React 19, TanStack Query, Zustand,
React Router 7) is a pure static build. Azure Static Web Apps auto-deploys
from GitHub on every push.

**Tier**: Free

Free tier includes global CDN, custom domain with managed SSL, GitHub Actions
CI/CD (auto-generated), and 100 GB bandwidth/month.

**Cost**: $0/month

---

### 3f. Azure Key Vault — secrets

Store JWT symmetric keys, the PostgreSQL connection string, Google OAuth
ClientId/ClientSecret, Internal:ApiKey, and the storage connection string
here instead of environment variables or source code.

**Tier**: Standard

- Secret operations: $0.03 per 10,000 transactions
- Key operations: $0.03 per 10,000 transactions

**Cost**: ~$0.03/month at personal-use volumes

---

### 3g. Redis — presence, feed cache, RealTimeHub backplane

Five services need Redis: RealTimeHub, FeedService, PresenceService,
AnalyticsService, NotificationService.

Azure Cache for Redis Basic C0 costs ~$13/month — by itself that exceeds the budget.

| Option | Monthly cost | Trade-off |
|---|---|---|
| Upstash Redis free tier (not Azure) | $0 | 10K req/day, 256 MB; fine for portfolio |
| Azure SignalR Service Free (RealTimeHub backplane only) | $0 | 20 connections, 20K messages/day |
| Redis container in ACA (minReplicas: 0) | ~$0 | Data lost on restart; cold starts |
| Redis container in ACA (minReplicas: 1) | ~$11/month | Reliable but eats the budget |
| Azure Cache for Redis Basic C0 | ~$13/month | Over budget alone |

**Recommendation**: Upstash free tier for Redis-backed services, Azure SignalR
Service Free tier for the RealTimeHub backplane. Switch to Azure Cache for Redis
if the project becomes public.

---

## 4. Monthly Cost Breakdown

All prices are East US, pay-as-you-go. Personal-use estimates assume ~30 minutes
of actual HTTP traffic per day.

| # | Azure Service | Tier / SKU | Purpose | $/month |
|---|---|---|---|---|
| 1 | Azure Container Apps | Consumption, scale-to-zero | All 18 microservices | ~$0-2 |
| 2 | Azure Database for PostgreSQL Flexible Server | Burstable B1ms + 32 GB | All service databases (one server) | ~$6-16 |
| 3 | Azure Blob Storage (LRS Hot) | General Purpose v2 | Media uploads | ~$0.20 |
| 4 | Azure Service Bus | Basic | social-events topic | ~$0.10 |
| 5 | Azure Static Web Apps | Free | React SPA | $0 |
| 6 | Azure Key Vault | Standard | Secrets and connection strings | ~$0.03 |
| 7 | Azure SignalR Service | Free F1 | RealTimeHub backplane | $0 |
| 8 | Redis via Upstash free | (not Azure) | Cache + pub/sub | $0 |
| | **Total** | | | **~$6-18** |

PostgreSQL range reflects whether the server is left running 24/7 or stopped
when idle. See Section 8.

**Realistic target with PostgreSQL stop/start: ~$9-10/month**

---

## 5. Free Tiers to Claim

These are permanent free tiers, not trial credits.

| Service | Free allowance | How it helps this project |
|---|---|---|
| Azure Static Web Apps | 100 GB bandwidth, custom domain, CI/CD | Hosts the React SPA at $0 |
| Azure Container Apps | 180K vCPU-s + 360K GiB-s per subscription/month | Covers all compute for low personal traffic |
| Azure Service Bus Basic | 10M operations/month included | Enough for learning |
| Azure SignalR Service Free F1 | 20 connections, 20,000 messages/day | Backs RealTimeHub backplane at $0 |
| Azure Key Vault | First 10K operations/month free | Covers all secret reads |
| Docker Hub (not Azure) | Unlimited public image repos | Avoids Azure Container Registry (~$5/month) |

---

## 6. What NOT to Buy

| Azure Service | Why to skip | Alternative |
|---|---|---|
| Azure Cache for Redis Basic C0 | ~$13/month — half the budget alone | Upstash free + Azure SignalR Service Free |
| Azure Container Registry Basic | ~$5/month | Docker Hub public repos (free) |
| Azure AI Search Basic | ~$75/month | PostgreSQL full-text search (tsvector/tsquery) |
| Azure Kubernetes Service | Node pool VMs = $35+/month | Azure Container Apps |
| Azure App Service B1 | ~$13/month x 18 services = $234 | Azure Container Apps |
| Azure Service Bus Standard | ~$10/month | Basic tier is sufficient for learning |
| Azure SignalR Service Standard | ~$49/month | Free F1 tier (20 connections) is enough |
| Azure SQL Database | Requires changing Npgsql drivers | Keep PostgreSQL |
| Azure Cosmos DB | $25+ minimum | Not needed; all services use relational data |
| Azure Front Door | ~$35/month | Not needed at personal scale |

---

## 7. Deployment Strategy

Do not deploy all 18 services on day one. Stage them to stay within the ACA
free vCPU-second grant and keep PostgreSQL memory pressure manageable on B1ms.

### Phase 1 — Core (start here)

| Service | Local port | Key Azure dependency |
|---|---|---|
| UserService | 5001 | PostgreSQL user_db, Blob Storage, Key Vault |
| MediaService | 5006 | PostgreSQL media_db, Blob Storage |
| SocialGraphService | 5002 | PostgreSQL social_graph, Service Bus |
| SocialContentService | 5003 | PostgreSQL social_content, Service Bus |
| RealTimeHub | 5007 | Azure SignalR Service Free |
| React SPA | — | Azure Static Web Apps |

### Phase 2 — Social feed and presence

| Service | Key Azure dependency |
|---|---|
| FeedService | PostgreSQL feed, Redis (Upstash), SocialGraphService, SocialContentService |
| PresenceService | Redis (Upstash), RealTimeHub |
| NotificationService | PostgreSQL, Redis, RealTimeHub |

### Phase 3 — Commerce

| Service | Key Azure dependency |
|---|---|
| CommerceService | PostgreSQL commerce_db |
| InventoryService | PostgreSQL inventory_db |
| OrderService | PostgreSQL order_db |

### Phase 4 — Supporting services

CommunicationService, SignalingService, ModerationService, AnalyticsService,
AdService, SearchService, StreamingService, AuthorizationService.

---

## 8. The One Trick That Makes $15 Work

**Manually stop the PostgreSQL Flexible Server when you are not developing.**

When the server is stopped:
- Compute billing stops immediately
- Storage billing continues (~$3.68/month for 32 GB)

```bash
# Stop before ending a session
az postgres flexible-server stop \
  --resource-group rg-socialcommerce \
  --name pgflex-socialcommerce

# Start when you need it again
az postgres flexible-server start \
  --resource-group rg-socialcommerce \
  --name pgflex-socialcommerce
```

**Cost math:**

| Hours running per day | Compute/month | Storage/month | Total PostgreSQL |
|---|---|---|---|
| 24 (always-on) | $12.41 | $3.68 | $16.09 |
| 12 | $6.21 | $3.68 | $9.89 |
| 8 | $4.14 | $3.68 | $7.82 |
| 4 (demo sessions only) | $2.07 | $3.68 | $5.75 |

Note: Azure auto-restarts stopped Flexible Servers after 7 days as a platform
policy. Check the portal if you take a break longer than a week.

**Full monthly estimate with PostgreSQL on 8 hrs/day:**

| Service | $/month |
|---|---|
| Azure Container Apps (scale-to-zero) | ~$1.00 |
| PostgreSQL Flexible Server B1ms (8 hrs/day) | ~$7.82 |
| Azure Blob Storage (LRS Hot, ~5 GB) | ~$0.20 |
| Azure Service Bus (Basic) | ~$0.10 |
| Azure Static Web Apps (Free) | $0 |
| Azure Key Vault (Standard) | ~$0.03 |
| Azure SignalR Service (Free F1) | $0 |
| Redis via Upstash free | $0 |
| **Total** | **~$9.15/month** |

---

## 9. Resource Naming and Region

### Region: eastus

East US has the lowest prices for ACA, PostgreSQL Flexible Server, and Blob Storage.

### Suggested resource names

```
Resource Group:          rg-socialcommerce
ACA Environment:         acaenv-socialcommerce
PostgreSQL Server:       pgflex-socialcommerce       (must be globally unique)
Storage Account:         stsocialcommerce            (3-24 chars, lowercase, globally unique)
Service Bus Namespace:   sb-socialcommerce
Key Vault:               kv-socialcommerce           (must be globally unique)
Static Web App:          swa-socialcommerce
SignalR Service:         sigr-socialcommerce
```

Keep every resource in the same resource group (rg-socialcommerce). This lets
you view the total spend in Azure Cost Management in one query and delete
everything with a single `az group delete` command.

---

## 10. Quick Setup Order

```bash
# 1. Resource group
az group create --name rg-socialcommerce --location eastus

# 2. PostgreSQL Flexible Server (B1ms, 32 GB)
az postgres flexible-server create \
  --resource-group rg-socialcommerce \
  --name pgflex-socialcommerce \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --admin-user scadmin \
  --admin-password "<strong-password>" \
  --location eastus \
  --public-access 0.0.0.0

# 3. Create one database per service (all on the same server)
for db in user_db media_db social_graph social_content feed \
          moderation_db communication_db signaling_db inventory_db \
          analytics_db ad_db order_db commerce_db notification_db search_db; do
  az postgres flexible-server db create \
    --server-name pgflex-socialcommerce \
    --resource-group rg-socialcommerce \
    --database-name $db
done

# 4. Blob Storage (LRS Hot) + media container
az storage account create \
  --name stsocialcommerce \
  --resource-group rg-socialcommerce \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

az storage container create \
  --name media \
  --account-name stsocialcommerce \
  --public-access off

# 5. Service Bus (Basic) + social-events topic
az servicebus namespace create \
  --name sb-socialcommerce \
  --resource-group rg-socialcommerce \
  --location eastus \
  --sku Basic

az servicebus topic create \
  --name social-events \
  --namespace-name sb-socialcommerce \
  --resource-group rg-socialcommerce

# 6. Key Vault
az keyvault create \
  --name kv-socialcommerce \
  --resource-group rg-socialcommerce \
  --location eastus

# 7. Azure Container Apps Environment
az containerapp env create \
  --name acaenv-socialcommerce \
  --resource-group rg-socialcommerce \
  --location eastus

# 8. Azure SignalR Service (Free F1 — backs RealTimeHub at $0)
az signalr create \
  --name sigr-socialcommerce \
  --resource-group rg-socialcommerce \
  --location eastus \
  --sku Free_F1 \
  --unit-count 1 \
  --service-mode Default

# 9. Stop PostgreSQL immediately to avoid burning compute during setup
az postgres flexible-server stop \
  --resource-group rg-socialcommerce \
  --name pgflex-socialcommerce

# 10. Static Web App (link to GitHub repo)
az staticwebapp create \
  --name swa-socialcommerce \
  --resource-group rg-socialcommerce \
  --location eastus \
  --source https://github.com/<your-username>/SocialCommerce \
  --branch main \
  --app-location "/socialcommerce" \
  --output-location "dist"
```

### Set a budget alert

Azure portal: Cost Management and Billing > Budgets > + Add > $15/month,
alert at 80% ($12). You will receive an email before you overspend.

---

## Summary

| Need | Azure Service | $/month |
|---|---|---|
| Run all microservices | Azure Container Apps (Consumption, scale-to-zero) | ~$1 |
| All PostgreSQL databases | Flexible Server B1ms (stop when idle) | ~$8 |
| Media file storage | Azure Blob Storage (LRS Hot) | ~$0.20 |
| Async events | Azure Service Bus (Basic) | ~$0.10 |
| React SPA hosting | Azure Static Web Apps (Free) | $0 |
| Secrets | Azure Key Vault (Standard) | ~$0.03 |
| SignalR backplane | Azure SignalR Service (Free F1) | $0 |
| Redis cache | Upstash free tier (not Azure) | $0 |
| Container images | Docker Hub public repos (not Azure) | $0 |
| **Total** | | **~$9-10/month** |
