#!/usr/bin/env pwsh
# =============================================================================
# SocialCommerce — Azure infrastructure reference
# All resources were provisioned in westus2 (eastus was restricted).
# Run individual sections to re-create resources if deleted.
# =============================================================================

# Deployed values
$LOCATION = "westus2"
$RG = "rg-socialcommerce"
$PG_SERVER = "pgflex-socialcommerce"
$PG_FQDN = "pgflex-socialcommerce.postgres.database.azure.com"
$PG_ADMIN_USER = "scadmin"
$STORAGE_ACCOUNT = "stsocialcommerce"
$SB_NAMESPACE = "sb-socialcommerce"
$SB_TOPIC = "social-events"
$SB_SUBSCRIPTION = "feed"
$KV_NAME = "kv-socialcommerce"
$ACA_ENV = "acaenv-socialcommerce"
$SIGNALR_NAME = "sigr-socialcommerce"
$SWA_NAME = "swa-socialcommerce"
$APP_ID = "225f53c4-44e1-4e54-b30b-ca3fb03a6dbe"   # SocialCommerce-GH-Actions
$TENANT_ID = "f2fd87bf-8646-4dc0-866f-7df36ec9183c"
$SUBSCRIPTION_ID = "76137a50-1c08-4589-bf67-0bc3f5650f89"
$GITHUB_REPO = "mknguyen1202/SocialCommerce"

# --- Start / Stop PostgreSQL ---
function Start-Postgres {
    az postgres flexible-server start `
        --resource-group $RG --name $PG_SERVER
}
function Stop-Postgres {
    az postgres flexible-server stop `
        --resource-group $RG --name $PG_SERVER
}

# --- GitHub Secrets required in repo Settings → Secrets → Actions ---
Write-Host @"
GitHub Secrets:
  AZURE_CLIENT_ID                 = $APP_ID
  AZURE_TENANT_ID                 = $TENANT_ID
  AZURE_SUBSCRIPTION_ID           = $SUBSCRIPTION_ID
  AZURE_STATIC_WEB_APPS_API_TOKEN = az keyvault secret show --vault-name $KV_NAME --name SWA-DeploymentToken --query value -o tsv
  DOCKER_HUB_USERNAME             = <your Docker Hub username>
  DOCKER_HUB_TOKEN                = <Docker Hub Settings → Security → New Access Token>
  GOOGLE_CLIENT_ID                = <real value>
  GOOGLE_CLIENT_SECRET            = <real value>
"@

# --- Update Google OAuth secrets when you have the real values ---
# az keyvault secret set --vault-name $KV_NAME --name "Google--ClientId"     --value "<real>"
# az keyvault secret set --vault-name $KV_NAME --name "Google--ClientSecret" --value "<real>"

# --- Seed Key Vault secrets (run once before first deploy) ---
# Retrieve the storage account connection string then paste it below.
#   az storage account show-connection-string --name stsocialcommerce --resource-group rg-socialcommerce -o tsv
#
# az keyvault secret set --vault-name $KV_NAME --name "PgAdminPassword"   --value "pgadmin_test_password"
# az keyvault secret set --vault-name $KV_NAME --name "JwtSymmetricKey"   --value "sc-dev-secret-key-min-32-bytes-long!!"
# az keyvault secret set --vault-name $KV_NAME --name "InternalApiKey"    --value "sc-dev-internal-api-key"
# az keyvault secret set --vault-name $KV_NAME --name "StorageConnection" --value "<connection-string from above>"
# az keyvault secret set --vault-name $KV_NAME --name "UpstashRedisUrl"   --value "<upstash-redis-connection-string>"
# Service Bus — get the primary connection string then store it:
#   $SB_CS = az servicebus namespace authorization-rule keys list --resource-group $RG --namespace-name $SB_NAMESPACE --name RootManageSharedAccessKey --query primaryConnectionString -o tsv
#   az keyvault secret set --vault-name $KV_NAME --name "ServiceBus--Connection" --value $SB_CS

# --- Budget alert (do this in the portal — CLI version is preview/broken) ---
# Portal: search "Cost Management" → Budgets → + Add
#   Scope     : Subscription 1 / rg-socialcommerce
#   Amount    : $15 / month
#   Alert 80% : email kmnguyen204@gmail.com

# =============================================================================
# STREAMING SLICE — Azure SignalR Service Free F1 + ACA apps
# Budget:  UserService ~$0 | StreamingService ~$0 | RealTimeHub ~$0
#          Postgres (8 hr/day) ~$7.82 | SignalR Free $0 | Total ~$8-11/mo
# =============================================================================

# --- 1. Provision Azure SignalR Service (Free F1) ---
# Run once.  Free tier: 20 concurrent connections, 20K messages/day.
# This replaces the Redis backplane so redis is not needed in the streaming slice.
#
# az signalr create `
#   --resource-group $RG `
#   --name $SIGNALR_NAME `
#   --sku Free_F1 `
#   --service-mode Default `
#   --location $LOCATION

# --- 2. Store SignalR connection string in Key Vault ---
# Run after step 1.
#
# $SIGR_CS = az signalr key list `
#   --resource-group $RG `
#   --name $SIGNALR_NAME `
#   --query primaryConnectionString -o tsv
#
# az keyvault secret set `
#   --vault-name $KV_NAME `
#   --name "AzureSignalRConnectionString" `
#   --value $SIGR_CS

# --- 3. Create streaming_db on the shared Postgres server ---
# Run once (server must be started first).
#
# az postgres flexible-server db create `
#   --resource-group $RG `
#   --server-name $PG_SERVER `
#   --database-name streaming_db

# --- 4. Deploy RealTimeHub to ACA with Azure SignalR backplane ---
# Prerequisites: image built and pushed to Docker Hub as <dockerhub-user>/realtimehub:latest
#
# az containerapp create `
#   --name realtimehub `
#   --resource-group $RG `
#   --environment $ACA_ENV `
#   --image <dockerhub-user>/realtimehub:latest `
#   --min-replicas 0 --max-replicas 3 `
#   --target-port 8080 --ingress external `
#   --secrets azuresignalrcs=keyvaultref:<kv-signalr-secret-id>,identityref:<managed-identity-id> `
#   --env-vars `
#     "ASPNETCORE_ENVIRONMENT=Production" `
#     "Azure__SignalR__ConnectionString=secretref:azuresignalrcs" `
#     "Authentication__Jwt__SymmetricKey=<from-keyvault>" `
#     "Internal__ApiKey=<from-keyvault>" `
#     "Cors__AllowedOrigins__0=https://<your-swa>.azurestaticapps.net"

# --- 5. Deploy StreamingService to ACA ---
# Prerequisites: streaming_db created, RealTimeHub deployed, StreamingService image pushed.
#
# az containerapp create `
#   --name streamingservice `
#   --resource-group $RG `
#   --environment $ACA_ENV `
#   --image <dockerhub-user>/streamingservice:latest `
#   --min-replicas 0 --max-replicas 2 `
#   --target-port 8080 --ingress internal `
#   --env-vars `
#     "ASPNETCORE_ENVIRONMENT=Production" `
#     "ConnectionStrings__Default=Host=$PG_FQDN;Database=streaming_db;Username=$PG_ADMIN_USER;Password=<from-keyvault>;SslMode=Require" `
#     "Authentication__Jwt__SymmetricKey=<from-keyvault>" `
#     "RealTimeHub__BaseUrl=https://<realtimehub-fqdn>" `
#     "Internal__ApiKey=<from-keyvault>"

# --- 6. Store SignalR connection string for local dev (optional) ---
# Set Azure__SignalR__ConnectionString in RealTimeHub appsettings.Development.json
# to point at the real Azure SignalR Service during local dev if you want to skip Redis.
# Leave it empty to use the Redis backplane from docker-compose.

# --- Budget guardrails ---
# After provisioning, confirm spend via:
#   az consumption usage list --start-date (Get-Date).AddDays(-7).ToString('yyyy-MM-dd') `
#     --end-date (Get-Date).ToString('yyyy-MM-dd') `
#     --query "[].{Service:instanceName,Cost:pretaxCost}" -o table
#
# Add a $25 warning alert and $35 hard alert in Cost Management:
# Portal → Cost Management → Budgets → + Add → Scope: rg-socialcommerce → $35/month

