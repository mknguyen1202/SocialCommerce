#!/usr/bin/env pwsh
# =============================================================================
# SocialCommerce — Azure Container Apps deployment
# Called by GitHub Actions on every push to main.
# Usage: ./scripts/deploy-aca.ps1 -ImageTag <sha> -DockerUser <username>
# =============================================================================
param(
    [Parameter(Mandatory)][string]$ImageTag,
    [Parameter(Mandatory)][string]$DockerUser,
    [Parameter(Mandatory)][string]$DockerHubToken
)

$ErrorActionPreference = "Stop"

$RG      = "rg-socialcommerce"
$ACA_ENV = "acaenv-socialcommerce"
$KV      = "kv-socialcommerce"

# ---------------------------------------------------------------------------
# Fetch secrets from Key Vault (keeps secrets out of workflow YAML and logs)
# Secret names match what is actually stored in kv-socialcommerce.
# ---------------------------------------------------------------------------
Write-Host "Fetching secrets from Key Vault '$KV'..."
$JWT_KEY      = az keyvault secret show --vault-name $KV --name "Jwt--SymmetricKey"              --query value -o tsv
$INTERNAL_KEY = az keyvault secret show --vault-name $KV --name "Internal--ApiKey"               --query value -o tsv
$STORAGE_CS   = az keyvault secret show --vault-name $KV --name "ConnectionStrings--BlobStorage" --query value -o tsv
$GOOGLE_ID    = az keyvault secret show --vault-name $KV --name "Google--ClientId"               --query value -o tsv
$GOOGLE_SEC   = az keyvault secret show --vault-name $KV --name "Google--ClientSecret"           --query value -o tsv
# Redis: add a 'Redis--Connection' secret to kv-socialcommerce with the Upstash URL when available.
# Until then, services fall back to a safe no-op local Redis (abortConnect=false prevents crashes).
$REDIS_URL    = (az keyvault secret show --vault-name $KV --name "Redis--Connection" --query value -o tsv 2>$null) ?? "localhost:6379,abortConnect=false"

# Per-service PostgreSQL connection strings (fully formed, include DB name)
$CS_USER      = az keyvault secret show --vault-name $KV --name "ConnStr-UserDb"         --query value -o tsv
$CS_CONTENT   = az keyvault secret show --vault-name $KV --name "ConnStr-SocialContent"  --query value -o tsv
$CS_GRAPH     = az keyvault secret show --vault-name $KV --name "ConnStr-SocialGraph"    --query value -o tsv
$CS_FEED      = az keyvault secret show --vault-name $KV --name "ConnStr-Feed"           --query value -o tsv
$CS_ANALYTICS = az keyvault secret show --vault-name $KV --name "ConnStr-AnalyticsDb"   --query value -o tsv
$CS_AD        = az keyvault secret show --vault-name $KV --name "ConnStr-AdDb"           --query value -o tsv
$CS_COMM      = az keyvault secret show --vault-name $KV --name "ConnStr-CommunicationDb" --query value -o tsv
$CS_INVENTORY = az keyvault secret show --vault-name $KV --name "ConnStr-InventoryDb"    --query value -o tsv
$CS_MEDIA     = az keyvault secret show --vault-name $KV --name "ConnStr-MediaDb"        --query value -o tsv
$CS_MOD       = az keyvault secret show --vault-name $KV --name "ConnStr-ModerationDb"   --query value -o tsv
$CS_SIGNAL    = az keyvault secret show --vault-name $KV --name "ConnStr-SignalingDb"    --query value -o tsv

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
            --name              $Name `
            --resource-group    $RG `
            --image             $Image `
            --registry-server   docker.io `
            --registry-username $DockerUser `
            --registry-password $DockerHubToken `
            --set-env-vars      @Env
    } else {
        az containerapp create `
            --name              $Name `
            --resource-group    $RG `
            --environment       $ACA_ENV `
            --image             $Image `
            --min-replicas      0 `
            --max-replicas      3 `
            --target-port       8080 `
            --ingress           $Ingress `
            --registry-server   docker.io `
            --registry-username $DockerUser `
            --registry-password $DockerHubToken `
            --env-vars          @Env
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
    "ConnectionStrings__Default=${CS_MEDIA}"
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
    "ConnectionStrings__Default=${CS_GRAPH}"
)

Upsert-App -Name "socialcontentservice" -Image (img "socialcontentservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${CS_CONTENT}"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
)

Upsert-App -Name "moderationservice" -Image (img "moderationservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${CS_MOD}"
)

Upsert-App -Name "inventoryservice" -Image (img "inventoryservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${CS_INVENTORY}"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
)

Upsert-App -Name "analyticsservice" -Image (img "analyticsservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${CS_ANALYTICS}"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "Redis__Connection=${REDIS_URL}"
)

Upsert-App -Name "adservice" -Image (img "adservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${CS_AD}"
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
    "ConnectionStrings__Default=${CS_USER}"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__Audience=sc-rt-hub"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "Authentication__Google__ClientId=${GOOGLE_ID}"
    "Authentication__Google__ClientSecret=${GOOGLE_SEC}"
    "MediaService__BaseUrl=http://mediaservice"
    "Internal__ApiKey=${INTERNAL_KEY}"
    "Cors__Origins=https://blue-sky-00ad0c90f.7.azurestaticapps.net,https://localhost:5173"
    "ReverseProxy__Clusters__socialcontent__Destinations__default__Address=http://socialcontentservice"
    "ReverseProxy__Clusters__feed__Destinations__default__Address=http://feedservice"
    "ReverseProxy__Clusters__communication__Destinations__default__Address=http://communicationservice"
)

Upsert-App -Name "feedservice" -Image (img "feedservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${CS_FEED}"
    "Redis__Connection=${REDIS_URL}"
    "GraphService__BaseUrl=http://socialgraphservice"
    "ContentService__BaseUrl=http://socialcontentservice"
)

Upsert-App -Name "communicationservice" -Image (img "communicationservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${CS_COMM}"
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
    "ConnectionStrings__Redis=${REDIS_URL}"
    "RealTimeHub__BaseUrl=http://realtimehub"
    "Internal__ApiKey=${INTERNAL_KEY}"
)

Upsert-App -Name "signalingservice" -Image (img "signalingservice") -Env @(
    "ASPNETCORE_URLS=http://+:8080"
    "ASPNETCORE_ENVIRONMENT=Development"
    "ConnectionStrings__Default=${CS_SIGNAL}"
    "Authentication__Jwt__Issuer=SocialCommerce"
    "Authentication__Jwt__SymmetricKey=${JWT_KEY}"
    "RealTimeHub__BaseUrl=http://realtimehub"
    "Internal__ApiKey=${INTERNAL_KEY}"
)

Write-Host "`nAll 13 services deployed successfully."
