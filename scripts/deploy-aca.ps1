#!/usr/bin/env pwsh
# =============================================================================
# SocialCommerce — Azure Container Apps deployment
# Called by GitHub Actions on every push to main.
# Usage: ./scripts/deploy-aca.ps1 -ImageTag <sha> -DockerUser <username>
# =============================================================================
param(
    [Parameter(Mandatory)][string]$ImageTag,
    [Parameter(Mandatory)][string]$DockerUser
)

$ErrorActionPreference = "Stop"

$RG      = "rg-socialcommerce"
$ACA_ENV = "acaenv-socialcommerce"
$KV      = "kv-socialcommerce"
$PG_FQDN = "pgflex-socialcommerce.postgres.database.azure.com"

# ---------------------------------------------------------------------------
# Fetch secrets from Key Vault (keeps secrets out of workflow YAML and logs)
# ---------------------------------------------------------------------------
Write-Host "Fetching secrets from Key Vault '$KV'..."
$PG_PASS      = az keyvault secret show --vault-name $KV --name "PgAdminPassword"   --query value -o tsv
$JWT_KEY      = az keyvault secret show --vault-name $KV --name "JwtSymmetricKey"   --query value -o tsv
$INTERNAL_KEY = az keyvault secret show --vault-name $KV --name "InternalApiKey"    --query value -o tsv
$STORAGE_CS   = az keyvault secret show --vault-name $KV --name "StorageConnection" --query value -o tsv
$REDIS_URL    = az keyvault secret show --vault-name $KV --name "UpstashRedisUrl"   --query value -o tsv

$PG_BASE = "Host=${PG_FQDN};Port=5432;Username=scadmin;Password=${PG_PASS};Ssl Mode=Require"

# ---------------------------------------------------------------------------
# Helper: create or update a container app
# ---------------------------------------------------------------------------
function Upsert-App {
    param(
        [string]   $Name,
        [string]   $Image,
        [string]   $Ingress = "internal",
        [string[]] $Env
    )

    Write-Host "`nDeploying $Name  ($Ingress)..."
    $exists = az containerapp show --name $Name --resource-group $RG --query name -o tsv 2>$null

    if ($exists) {
        az containerapp update `
            --name           $Name `
            --resource-group $RG `
            --image          $Image `
            --set-env-vars   @Env
    } else {
        az containerapp create `
            --name           $Name `
            --resource-group $RG `
            --environment    $ACA_ENV `
            --image          $Image `
            --min-replicas   0 `
            --max-replicas   3 `
            --target-port    8080 `
            --ingress        $Ingress `
            --env-vars       @Env
    }

    if ($LASTEXITCODE -ne 0) { throw "Failed to deploy $Name (exit $LASTEXITCODE)" }
    Write-Host "$Name  OK"
}

# Shorthand: image name follows the convention set in build.yml
function img([string]$service) { "${DockerUser}/sc-${service}:${ImageTag}" }

# ===========================================================================
# Phase 1 — services with no intra-cluster call dependencies
# ===========================================================================
Write-Host "`n===== Phase 1: leaf services ====="

Upsert-App -Name "mediaservice" -Image (img "mediaservice") -Ingress "external" -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=media_db"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "AzureStorage__ConnectionString=${STORAGE_CS}"
    "AzureStorage__Container=media"
)

Upsert-App -Name "realtimehub" -Image (img "realtimehub") -Ingress "external" -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__Audience=sc-rt-hub"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "Redis__Connection=${REDIS_URL}"
    "Internal__ApiKey=${INTERNAL_KEY}"
)

Upsert-App -Name "socialgraphservice" -Image (img "socialgraphservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=social_graph"
)

Upsert-App -Name "socialcontentservice" -Image (img "socialcontentservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=social_content"
)

Upsert-App -Name "moderationservice" -Image (img "moderationservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=moderation_db"
)

Upsert-App -Name "inventoryservice" -Image (img "inventoryservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=inventory_db"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
)

Upsert-App -Name "analyticsservice" -Image (img "analyticsservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=analytics_db"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "Redis__Connection=${REDIS_URL}"
)

Upsert-App -Name "adservice" -Image (img "adservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=ad_db"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
)

# ===========================================================================
# Phase 2 — services that call other services inside the cluster
# Inter-service URLs use the ACA internal DNS: http://<app-name> (port 80)
# ===========================================================================
Write-Host "`n===== Phase 2: services with intra-cluster calls ====="

Upsert-App -Name "userservice" -Image (img "userservice") -Ingress "external" -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=user_db"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__Audience=sc-rt-hub"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "MediaService__BaseUrl=http://mediaservice"
    "Internal__ApiKey=${INTERNAL_KEY}"
)

Upsert-App -Name "feedservice" -Image (img "feedservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=feed"
    "Redis__Connection=${REDIS_URL}"
    "GraphService__BaseUrl=http://socialgraphservice"
    "ContentService__BaseUrl=http://socialcontentservice"
)

Upsert-App -Name "communicationservice" -Image (img "communicationservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=communication_db"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "RealTimeHub__BaseUrl=http://realtimehub"
    "Internal__ApiKey=${INTERNAL_KEY}"
)

Upsert-App -Name "presenceservice" -Image (img "presenceservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "Redis__Connection=${REDIS_URL}"
    "RealTimeHub__BaseUrl=http://realtimehub"
    "Internal__ApiKey=${INTERNAL_KEY}"
)

Upsert-App -Name "signalingservice" -Image (img "signalingservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${PG_BASE};Database=signaling_db"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "RealTimeHub__BaseUrl=http://realtimehub"
    "Internal__ApiKey=${INTERNAL_KEY}"
)

Write-Host "`nAll 13 services deployed successfully."
