#!/usr/bin/env pwsh
# =============================================================================
# SocialCommerce — Azure infrastructure reference
# All resources were provisioned in westus2 (eastus was restricted).
# Run individual sections to re-create resources if deleted.
# =============================================================================

# Deployed values
$LOCATION          = "westus2"
$RG                = "rg-socialcommerce"
$PG_SERVER         = "pgflex-socialcommerce"
$PG_FQDN           = "pgflex-socialcommerce.postgres.database.azure.com"
$PG_ADMIN_USER     = "scadmin"
$STORAGE_ACCOUNT   = "stsocialcommerce"
$SB_NAMESPACE      = "sb-socialcommerce"
$SB_QUEUE          = "social-events"
$KV_NAME           = "kv-socialcommerce"
$ACA_ENV           = "acaenv-socialcommerce"
$SIGNALR_NAME      = "sigr-socialcommerce"
$SWA_NAME          = "swa-socialcommerce"
$APP_ID            = "225f53c4-44e1-4e54-b30b-ca3fb03a6dbe"   # SocialCommerce-GH-Actions
$TENANT_ID         = "f2fd87bf-8646-4dc0-866f-7df36ec9183c"
$SUBSCRIPTION_ID   = "76137a50-1c08-4589-bf67-0bc3f5650f89"
$GITHUB_REPO       = "mknguyen1202/SocialCommerce"

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

# --- Budget alert (do this in the portal — CLI version is preview/broken) ---
# Portal: search "Cost Management" → Budgets → + Add
#   Scope     : Subscription 1 / rg-socialcommerce
#   Amount    : $15 / month
#   Alert 80% : email kmnguyen204@gmail.com
