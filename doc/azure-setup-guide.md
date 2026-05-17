# SocialCommerce — Azure Setup Guide

> Step-by-step instructions to provision and deploy the SocialCommerce
> super-app on Azure as a **personal / dev project**.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Azure Account & Subscription](#2-azure-account--subscription)
3. [Install Tooling](#3-install-tooling)
4. [Create a Resource Group](#4-create-a-resource-group)
5. [Provision Azure Container Registry (ACR)](#5-provision-azure-container-registry-acr)
6. [Provision Azure Database for PostgreSQL](#6-provision-azure-database-for-postgresql)
7. [Provision Azure Cache for Redis](#7-provision-azure-cache-for-redis)
8. [Provision Azure Blob Storage](#8-provision-azure-blob-storage)
9. [Provision Azure Service Bus](#9-provision-azure-service-bus)
10. [Provision Azure Kubernetes Service (AKS)](#10-provision-azure-kubernetes-service-aks)
11. [Configure Microsoft Entra ID (OAuth)](#11-configure-microsoft-entra-id-oauth)
12. [Build & Push Container Images](#12-build--push-container-images)
13. [Create Kubernetes Secrets & ConfigMaps](#13-create-kubernetes-secrets--configmaps)
14. [Deploy Services to AKS](#14-deploy-services-to-aks)
15. [Expose the App (Ingress / Domain / TLS)](#15-expose-the-app-ingress--domain--tls)
16. [Verify the Deployment](#16-verify-the-deployment)
17. [Optional — Monitoring & Observability](#17-optional--monitoring--observability)
18. [Cost-Saving Tips for Personal Projects](#18-cost-saving-tips-for-personal-projects)

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| Azure account | [Free tier](https://azure.microsoft.com/free/) includes $200 credit for 30 days |
| Azure CLI (`az`) | v2.60+ — install via `winget install Microsoft.AzureCLI` |
| Docker Desktop | For building container images locally |
| kubectl | Kubernetes CLI — bundled with Docker Desktop or `az aks install-cli` |
| Helm 3 | Package manager for Kubernetes (`winget install Helm.Helm`) |
| PowerShell 7+ | Your preferred shell |

---

## 2. Azure Account & Subscription

1. Go to <https://portal.azure.com> and sign in (or create a free account).
2. Verify you have an active subscription:

```powershell
az login
az account show --query "{name:name, id:id, state:state}" -o table
```

> **Tip:** If you have multiple subscriptions, set the one you want:
> `az account set --subscription "<subscription-id>"`

---

## 3. Install Tooling

```powershell
# Azure CLI
winget install Microsoft.AzureCLI

# kubectl (if not already installed)
az aks install-cli

# Helm
winget install Helm.Helm
```

---

## 4. Create a Resource Group

A resource group is a logical container for all your Azure resources.

```powershell
$RESOURCE_GROUP = "rg-socialcommerce"
$LOCATION       = "eastus"   # pick a region close to you

az group create --name $RESOURCE_GROUP --location $LOCATION
```

---

## 5. Provision Azure Container Registry (ACR)

ACR stores your Docker images so AKS can pull them.

```powershell
$ACR_NAME = "acrsocialcommerce"   # must be globally unique, alphanumeric only

az acr create `
  --resource-group $RESOURCE_GROUP `
  --name $ACR_NAME `
  --sku Basic `
  --admin-enabled true
```

Retrieve the login server (you'll need it later):

```powershell
az acr show --name $ACR_NAME --query loginServer -o tsv
# → acrsocialcommerce.azurecr.io
```

---

## 6. Provision Azure Database for PostgreSQL

The project uses **16 separate logical databases** inside a single PostgreSQL instance.

### Create the Flexible Server

```powershell
$PG_SERVER  = "pg-socialcommerce"       # globally unique
$PG_ADMIN   = "pgadmin"
$PG_PASS    = "<generate-a-strong-password>"

az postgres flexible-server create `
  --resource-group $RESOURCE_GROUP `
  --name $PG_SERVER `
  --location $LOCATION `
  --admin-user $PG_ADMIN `
  --admin-password $PG_PASS `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --storage-size 32 `
  --version 16 `
  --public-access 0.0.0.0
```

> **`Standard_B1ms` (Burstable)** is the cheapest tier — great for dev/personal use.

### Create Each Service Database

```powershell
$databases = @(
  "user_db", "social_graph_db", "social_content_db", "feed_db",
  "moderation_db", "media_db", "communication_db", "signaling_db",
  "streaming_db", "commerce_db", "order_db", "inventory_db",
  "analytics_db", "ad_db", "notification_db", "search_db"
)

foreach ($db in $databases) {
  az postgres flexible-server db create `
    --resource-group $RESOURCE_GROUP `
    --server-name $PG_SERVER `
    --database-name $db
}
```

### Allow AKS to Connect

After AKS is created (Step 10), add a firewall rule or use a VNet integration.
For quick dev access you can also allow your client IP:

```powershell
az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $PG_SERVER `
  --rule-name AllowMyIP `
  --start-ip-address <your-ip> `
  --end-ip-address <your-ip>
```

---

## 7. Provision Azure Cache for Redis

Redis is used by **RealTimeHub** (SignalR backplane), **PresenceService**,
**FeedService**, **ModerationService**, and **AnalyticsService**.

```powershell
$REDIS_NAME = "redis-socialcommerce"   # globally unique

az redis create `
  --resource-group $RESOURCE_GROUP `
  --name $REDIS_NAME `
  --location $LOCATION `
  --sku Basic `
  --vm-size c0
```

> **Basic C0** is the cheapest tier (250 MB, no SLA — fine for personal projects).

Retrieve the connection string:

```powershell
az redis show --resource-group $RESOURCE_GROUP --name $REDIS_NAME --query hostName -o tsv
az redis list-keys --resource-group $RESOURCE_GROUP --name $REDIS_NAME --query primaryKey -o tsv
# Connection string format: <hostname>:6380,password=<key>,ssl=True,abortConnect=False
```

---

## 8. Provision Azure Blob Storage

Used by **MediaService** for avatar uploads, attachments, and media files.

```powershell
$STORAGE_ACCOUNT = "stsocialcommerce"   # globally unique, lowercase, no hyphens

az storage account create `
  --resource-group $RESOURCE_GROUP `
  --name $STORAGE_ACCOUNT `
  --location $LOCATION `
  --sku Standard_LRS `
  --kind StorageV2

# Create a container for media uploads
az storage container create `
  --account-name $STORAGE_ACCOUNT `
  --name media `
  --public-access blob
```

Retrieve the connection string:

```powershell
az storage account show-connection-string `
  --resource-group $RESOURCE_GROUP `
  --name $STORAGE_ACCOUNT `
  --query connectionString -o tsv
```

---

## 9. Provision Azure Service Bus

The architecture document specifies Azure Service Bus as the production
message broker (replacing Redis Pub/Sub used in dev).

```powershell
$SB_NAMESPACE = "sb-socialcommerce"   # globally unique

az servicebus namespace create `
  --resource-group $RESOURCE_GROUP `
  --name $SB_NAMESPACE `
  --location $LOCATION `
  --sku Basic
```

> **Basic tier** supports queues only (no topics). Upgrade to **Standard**
> if you need topics/subscriptions for pub/sub fan-out.

Retrieve the connection string:

```powershell
az servicebus namespace authorization-rule keys list `
  --resource-group $RESOURCE_GROUP `
  --namespace-name $SB_NAMESPACE `
  --name RootManageSharedAccessKey `
  --query primaryConnectionString -o tsv
```

---

## 10. Provision Azure Kubernetes Service (AKS)

AKS hosts all 18 microservices as Kubernetes deployments.

```powershell
$AKS_CLUSTER = "aks-socialcommerce"

az aks create `
  --resource-group $RESOURCE_GROUP `
  --name $AKS_CLUSTER `
  --location $LOCATION `
  --node-count 2 `
  --node-vm-size Standard_B2s `
  --generate-ssh-keys `
  --attach-acr $ACR_NAME `
  --enable-managed-identity
```

> **`Standard_B2s`** (2 vCPU, 4 GB RAM) is a budget-friendly burstable VM.
> Two nodes give you basic availability. Scale up later as needed.

Connect kubectl:

```powershell
az aks get-credentials `
  --resource-group $RESOURCE_GROUP `
  --name $AKS_CLUSTER

kubectl get nodes   # verify connectivity
```

---

## 11. Configure Microsoft Entra ID (OAuth)

UserService acts as the BFF and supports Google, Facebook, and Apple OAuth.
You need to register these external providers **and** optionally register
your app in Entra ID.

### 11a. Register an Entra ID App (optional — for Entra-based login)

1. Go to **Azure Portal → Microsoft Entra ID → App registrations → New registration**.
2. Set the redirect URI to `https://<your-domain>/auth/callback`.
3. Note the **Application (client) ID** and **Directory (tenant) ID**.
4. Under **Certificates & secrets**, create a client secret.

### 11b. Register External OAuth Providers

| Provider | Console | Redirect URI |
|---|---|---|
| Google | <https://console.cloud.google.com/apis/credentials> | `https://<your-domain>/auth/google/callback` |
| Facebook | <https://developers.facebook.com/apps> | `https://<your-domain>/auth/facebook/callback` |
| Apple | <https://developer.apple.com/account/resources/authkeys/list> | `https://<your-domain>/auth/apple/callback` |

Store the resulting client IDs and secrets — you'll add them as Kubernetes
secrets in the next step.

---

## 12. Build & Push Container Images

Build each service image and push to ACR.

```powershell
$ACR_LOGIN_SERVER = az acr show --name $ACR_NAME --query loginServer -o tsv
az acr login --name $ACR_NAME

# Example for UserService (repeat for each service)
docker build -t "${ACR_LOGIN_SERVER}/userservice:latest" -f services/UserService/Dockerfile services/UserService
docker push "${ACR_LOGIN_SERVER}/userservice:latest"
```

### Automated — build all services

```powershell
$services = @(
  @{ name = "userservice";          path = "services/UserService" },
  @{ name = "mediaservice";         path = "services/MediaService" },
  @{ name = "realtimehub";          path = "services/RealTimeHub" },
  @{ name = "socialcontentservice"; path = "services/SocialContentService" },
  @{ name = "socialgraphservice";   path = "services/SocialGraphService" },
  @{ name = "feedservice";          path = "services/FeedService" },
  @{ name = "moderationservice";    path = "services/ModerationService" },
  @{ name = "communicationservice"; path = "services/CommunicationService" },
  @{ name = "presenceservice";      path = "services/PresenceService" },
  @{ name = "signalingservice";     path = "services/SignalingService" },
  @{ name = "streamingservice";     path = "services/StreamingService" },
  @{ name = "commerceservice";      path = "services/CommerceService" },
  @{ name = "orderservice";         path = "services/OrderService" },
  @{ name = "inventoryservice";     path = "services/InventoryService" },
  @{ name = "analyticsservice";     path = "services/AnalyticsService" },
  @{ name = "adservice";            path = "services/AdService" },
  @{ name = "authorizationservice"; path = "services/AuthorizationService" },
  @{ name = "notificationservice";  path = "services/NotificationService" }
)

foreach ($svc in $services) {
  Write-Host "Building $($svc.name)..."
  docker build -t "${ACR_LOGIN_SERVER}/$($svc.name):latest" -f "$($svc.path)/Dockerfile" $svc.path
  docker push "${ACR_LOGIN_SERVER}/$($svc.name):latest"
}
```

---

## 13. Create Kubernetes Secrets & ConfigMaps

### Namespace

```powershell
kubectl create namespace socialcommerce
```

### Shared Secrets

```powershell
kubectl create secret generic pg-credentials `
  --namespace socialcommerce `
  --from-literal=host="pg-socialcommerce.postgres.database.azure.com" `
  --from-literal=username="pgadmin" `
  --from-literal=password="<your-pg-password>"

kubectl create secret generic redis-credentials `
  --namespace socialcommerce `
  --from-literal=connection="redis-socialcommerce.redis.cache.windows.net:6380,password=<key>,ssl=True,abortConnect=False"

kubectl create secret generic jwt-signing `
  --namespace socialcommerce `
  --from-literal=symmetric-key="<generate-a-32+-byte-key>"

kubectl create secret generic internal-api `
  --namespace socialcommerce `
  --from-literal=api-key="<generate-a-strong-api-key>"

kubectl create secret generic blob-storage `
  --namespace socialcommerce `
  --from-literal=connection-string="<storage-connection-string>"

kubectl create secret generic oauth-google `
  --namespace socialcommerce `
  --from-literal=client-id="<google-client-id>" `
  --from-literal=client-secret="<google-client-secret>"

kubectl create secret generic oauth-facebook `
  --namespace socialcommerce `
  --from-literal=client-id="<facebook-app-id>" `
  --from-literal=client-secret="<facebook-app-secret>"
```

### ConfigMap (non-sensitive settings)

```powershell
kubectl create configmap app-config `
  --namespace socialcommerce `
  --from-literal=ASPNETCORE_ENVIRONMENT="Production" `
  --from-literal=Authentication__Jwt__Issuer="SocialCommerce" `
  --from-literal=Authentication__Jwt__Audience="sc-rt-hub"
```

---

## 14. Deploy Services to AKS

Create a Kubernetes **Deployment + Service** manifest for each microservice.
Below is a template for **UserService** — adapt it for each service by
changing the image, port, database name, and environment variables.

### `k8s/userservice.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: userservice
  namespace: socialcommerce
spec:
  replicas: 1
  selector:
    matchLabels:
      app: userservice
  template:
    metadata:
      labels:
        app: userservice
    spec:
      containers:
        - name: userservice
          image: acrsocialcommerce.azurecr.io/userservice:latest
          ports:
            - containerPort: 8080
          env:
            - name: ASPNETCORE_URLS
              value: "http://+:8080"
            - name: ASPNETCORE_ENVIRONMENT
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: ASPNETCORE_ENVIRONMENT
            - name: ConnectionStrings__Default
              valueFrom:
                secretKeyRef:
                  name: pg-credentials
                  key: host
              # Build the full connection string in an init script or use
              # a helper — simplified here for readability:
              # "Host=<host>;Port=5432;Database=user_db;Username=<user>;Password=<pass>;Ssl Mode=Require"
            - name: Authentication__Jwt__SymmetricKey
              valueFrom:
                secretKeyRef:
                  name: jwt-signing
                  key: symmetric-key
            - name: Internal__ApiKey
              valueFrom:
                secretKeyRef:
                  name: internal-api
                  key: api-key
            - name: MediaService__BaseUrl
              value: "http://mediaservice.socialcommerce.svc.cluster.local:8080"
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: userservice
  namespace: socialcommerce
spec:
  selector:
    app: userservice
  ports:
    - port: 8080
      targetPort: 8080
  type: ClusterIP
```

Deploy:

```powershell
kubectl apply -f k8s/userservice.yaml
# Repeat for all services
```

---

## 15. Expose the App (Ingress / Domain / TLS)

### 15a. Install NGINX Ingress Controller

```powershell
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx `
  --namespace ingress-nginx `
  --create-namespace `
  --set controller.replicaCount=1
```

### 15b. Get the External IP

```powershell
kubectl get svc -n ingress-nginx
# Note the EXTERNAL-IP of the ingress-nginx-controller LoadBalancer
```

### 15c. Point Your Domain

If you have a custom domain, create an **A record** pointing to the external IP.
For testing, you can use the IP directly or a free service like `nip.io`.

### 15d. Create an Ingress Resource

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: socialcommerce-ingress
  namespace: socialcommerce
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: socialcommerce.example.com   # replace with your domain
      http:
        paths:
          - path: /api/user
            pathType: Prefix
            backend:
              service:
                name: userservice
                port:
                  number: 8080
          - path: /api/media
            pathType: Prefix
            backend:
              service:
                name: mediaservice
                port:
                  number: 8080
          - path: /hubs
            pathType: Prefix
            backend:
              service:
                name: realtimehub
                port:
                  number: 8080
          # Add paths for all other services...
```

### 15e. TLS with cert-manager (Let's Encrypt)

```powershell
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager `
  --namespace cert-manager `
  --create-namespace `
  --set crds.enabled=true
```

Create a `ClusterIssuer`:

```yaml
# k8s/cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

Add the TLS annotation to your Ingress:

```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - socialcommerce.example.com
      secretName: socialcommerce-tls
```

---

## 16. Verify the Deployment

```powershell
# Check all pods are running
kubectl get pods -n socialcommerce

# Check services
kubectl get svc -n socialcommerce

# Tail logs for a specific service
kubectl logs -n socialcommerce deployment/userservice -f

# Test the UserService health endpoint
curl https://socialcommerce.example.com/api/user/profile
```

---

## 17. Optional — Monitoring & Observability

| Tool | Purpose | How to Enable |
|---|---|---|
| **Azure Monitor + Container Insights** | Cluster & pod metrics, log analytics | `az aks enable-addons -a monitoring -n aks-socialcommerce -g rg-socialcommerce` |
| **Application Insights** | Per-service APM, distributed tracing | Add the `Microsoft.ApplicationInsights.AspNetCore` NuGet package and set the connection string |
| **Azure Log Analytics** | Centralized log queries (KQL) | Enabled automatically with Container Insights |
| **Grafana (Azure Managed)** | Dashboards | Provision via portal and connect to Azure Monitor |

---

## 18. Cost-Saving Tips for Personal Projects

| Area | Recommendation |
|---|---|
| **AKS nodes** | Use `Standard_B2s` burstable VMs. Start with 1–2 nodes. |
| **PostgreSQL** | Use **Burstable B1ms** tier. Stop the server when not in use: `az postgres flexible-server stop --resource-group rg-socialcommerce --name pg-socialcommerce` |
| **Redis** | Use **Basic C0** (250 MB). |
| **Blob Storage** | **Standard_LRS** is the cheapest redundancy option. |
| **Service Bus** | **Basic** tier for queues; upgrade to Standard only when you need topics. |
| **ACR** | **Basic** tier is sufficient for personal projects. |
| **Idle clusters** | Stop AKS when not in use: `az aks stop --resource-group rg-socialcommerce --name aks-socialcommerce` |
| **Budget alerts** | Set a spending alert: Portal → Cost Management → Budgets → Create. |
| **Free tier** | Use the $200 credit (new accounts) and keep an eye on which services are still in free-tier limits. |

---

## Quick-Reference — Azure Resources Summary

| Resource | Azure Service | SKU / Tier | Name |
|---|---|---|---|
| Container images | Azure Container Registry | Basic | `acrsocialcommerce` |
| Kubernetes cluster | Azure Kubernetes Service | Standard_B2s × 2 | `aks-socialcommerce` |
| PostgreSQL | Azure Database for PostgreSQL Flexible Server | Burstable B1ms | `pg-socialcommerce` |
| Redis | Azure Cache for Redis | Basic C0 | `redis-socialcommerce` |
| Blob storage | Azure Storage Account | Standard LRS | `stsocialcommerce` |
| Message broker | Azure Service Bus | Basic | `sb-socialcommerce` |
| Identity | Microsoft Entra ID | Free tier | (tenant-level) |
| DNS + TLS | Custom domain + cert-manager | — | — |
| Monitoring | Azure Monitor + Container Insights | — | — |

---

## Next Steps

- [ ] Write Helm charts or Kustomize overlays per service for repeatable deploys.
- [ ] Set up a **GitHub Actions** CI/CD pipeline to build, push, and deploy on every merge to `main`.
- [ ] Add **health checks** (`/healthz`) to each service and configure Kubernetes liveness/readiness probes.
- [ ] Migrate from symmetric JWT signing keys to **RSA/ECDSA** key pairs stored in **Azure Key Vault**.
- [ ] Evaluate **Azure Container Apps** as a simpler alternative to AKS if you don't need full Kubernetes control.
