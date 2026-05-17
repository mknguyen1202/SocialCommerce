# Azure Functions — What, Why, and How

> A practical learning guide for .NET developers, with examples drawn from
> the SocialCommerce microservices project.

---

## Table of Contents

1. [What Is Azure Functions?](#1-what-is-azure-functions)
2. [Why Use Azure Functions?](#2-why-use-azure-functions)
3. [Core Concepts](#3-core-concepts)
4. [Trigger Types](#4-trigger-types)
5. [Bindings](#5-bindings)
6. [Hosting Models](#6-hosting-models)
7. [How It Works Internally](#7-how-it-works-internally)
8. [Writing a Function in .NET 9](#8-writing-a-function-in-net-9)
9. [SocialCommerce — Where Functions Would Fit](#9-socialcommerce--where-functions-would-fit)
10. [Local Development](#10-local-development)
11. [Deployment](#11-deployment)
12. [Cost at Personal Scale](#12-cost-at-personal-scale)
13. [When NOT to Use Azure Functions](#13-when-not-to-use-azure-functions)

---

## 1. What Is Azure Functions?

Azure Functions is Microsoft's **serverless compute** service. You write
a small, focused piece of code (a *function*), and Azure handles everything
else: provisioning servers, OS patching, scaling, and load balancing.

You do not manage infrastructure. You only pay for the time your code
actually runs (Consumption plan).

```
Your code → triggered by an event → runs → returns / produces output → shuts down
```

Think of it as a managed event handler that lives in the cloud.

---

## 2. Why Use Azure Functions?

| Problem | Without Functions | With Functions |
|---|---|---|
| Process a Service Bus message | Long-running BackgroundService in a container that must stay alive 24/7 | Function wakes only when a message arrives |
| Resize an image after upload | Poll Blob Storage on a timer or add complexity to MediaService | Blob trigger fires automatically on every new blob |
| Send a daily digest email | Cron job running in a container | Timer trigger, zero infrastructure |
| Lightweight webhook endpoint | Full ASP.NET Core app with Dockerfile | Single HTTP-triggered function |
| Burst traffic handling | Pre-scale containers, pay for idle | Functions auto-scale to thousands of instances in seconds |

**Core benefits:**

- **No idle cost** — Consumption plan charges per execution, not per hour.
- **Auto-scale** — From 0 to hundreds of instances automatically.
- **Event-driven** — Natively integrates with Service Bus, Event Grid, Blob
  Storage, Redis, HTTP, timers, and more via bindings.
- **Reduced boilerplate** — No `Program.cs`, no middleware pipeline, no
  `Dockerfile` required for simple triggers.
- **Durable Functions** — Built-in support for stateful workflows
  (orchestrations, fans-out, human approval steps).

---

## 3. Core Concepts

### Function

A single method decorated with a trigger attribute. It is the unit of
deployment and scaling.

### Function App

A container (the Azure resource) that groups one or more functions. They
share the same hosting plan, runtime, settings, and deployment package.

### Trigger

What causes the function to run. Every function has exactly **one** trigger.

### Binding

Declarative connections to external services (input or output). A function
can have zero or more bindings in addition to its trigger. Bindings
eliminate boilerplate SDK code for common read/write operations.

### Host

The Azure Functions host (`Microsoft.Azure.Functions.Worker`) manages
the lifecycle: discovers functions, invokes them, handles retries,
and reports telemetry to Application Insights.

---

## 4. Trigger Types

| Trigger | Fires when… | Common use |
|---|---|---|
| **HTTP** | An HTTP request hits a generated URL | Webhooks, lightweight APIs, callbacks |
| **Timer** | A CRON schedule is reached | Nightly cleanup, daily reports, scheduled jobs |
| **Service Bus** | A message arrives on a queue or topic subscription | Async event processing |
| **Blob Storage** | A blob is created or updated in a container | Image/video processing, file ETL |
| **Event Grid** | An Event Grid event is published | React to Azure platform events |
| **Event Hubs** | An event batch arrives on a hub | High-throughput telemetry ingestion |
| **Cosmos DB** | A change feed event fires | Materialized view updates, audit logs |
| **Queue Storage** | A message is enqueued | Simple task queues |
| **Redis** | (preview) A Redis pub/sub message arrives | Cache-aside refresh, real-time routing |
| **Durable** | Orchestrator / activity / entity pattern | Multi-step stateful workflows |

---

## 5. Bindings

Bindings let you read from or write to services **without writing SDK
connection code**. They are declared with attributes.

```csharp
// Trigger: Service Bus message arrives on "moderation-queue"
// Input binding: read the flagged blob from storage automatically
// Output binding: write result to a different queue automatically
[Function("ReviewContent")]
[ServiceBusOutput("reviewed-queue", Connection = "ServiceBusConn")]
public string Run(
    [ServiceBusTrigger("moderation-queue", Connection = "ServiceBusConn")]
    string rawMessage,
    [BlobInput("uploads/{BlobName}", Connection = "StorageConn")]
    Stream blobContent)
{
    // blobContent is already opened and ready to read
    // return value is automatically sent to reviewed-queue
    return Process(rawMessage, blobContent);
}
```

**Common binding directions:**

| Direction | Attribute example | Effect |
|---|---|---|
| Trigger | `[ServiceBusTrigger]` | Provides the event payload |
| Input | `[BlobInput]` | Reads data into a parameter |
| Output | `[ServiceBusOutput]` (on method) | Writes return value to the service |
| Output | `[BlobOutput]` | Writes a parameter's value to Blob Storage |

---

## 6. Hosting Models

### Isolated Worker Model (recommended for .NET 8+)

The function runs in a **separate process** from the Functions host. This
gives full control over the .NET version, dependency injection, and
middleware. Required for .NET 9.

```xml
<PackageReference Include="Microsoft.Azure.Functions.Worker" Version="2.*" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="2.*" />
```

### In-Process Model (legacy, .NET 6/8 only, retiring 2026)

The function runs inside the host process. Simpler but tightly coupled
to the host's .NET version. Do not start new projects with this model.

### Flex Consumption Plan (newest, 2024+)

An evolution of the Consumption plan with faster cold starts, more
memory options, and VNet integration. Recommended for production.

---

## 7. How It Works Internally

```
1. Event source (Service Bus, Blob, HTTP, Timer…)
        │
        ▼
2. Azure Functions Host
   - Polls / subscribes to trigger source
   - Deserializes the event payload
        │
        ▼
3. Your Function Method is invoked
   - Input bindings are resolved (data fetched from Azure services)
   - Your code runs
   - Return value / output binding parameters are written
        │
        ▼
4. Host reports telemetry to Application Insights
   - Invocation ID, duration, success/failure, custom logs
        │
        ▼
5. On failure: retry policy is applied (fixed delay or exponential backoff)
   Dead-letter queue receives messages after max retries
```

**Scale-out:**

On the Consumption plan the host measures queue/topic depth and
concurrently active invocations, then adds more instances automatically.
Each instance runs independently. Stateful coordination requires
Durable Functions or an external store.

---

## 8. Writing a Function in .NET 9

### Project setup

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Create a new isolated-worker function app
func init SocialCommerceFunctions --worker-runtime dotnet-isolated --target-framework net9.0
cd SocialCommerceFunctions

# Add a Service Bus triggered function
func new --name ProcessSocialEvent --template "Service Bus Topic Trigger"
```

### `Program.cs` (isolated worker)

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

IHost host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        // Register your own services here exactly like ASP.NET Core
    })
    .Build();

await host.RunAsync();
```

### Minimal HTTP function

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

namespace SocialCommerceFunctions;

public class HealthFunction
{
    [Function("Health")]
    public HttpResponseData Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")]
        HttpRequestData req)
    {
        HttpResponseData response = req.CreateResponse(HttpStatusCode.OK);
        response.WriteString("OK");
        return response;
    }
}
```

### Timer function

```csharp
[Function("DailyDigest")]
public async Task Run(
    [TimerTrigger("0 0 8 * * *")] TimerInfo timerInfo, // 08:00 UTC daily
    FunctionContext context)
{
    ILogger logger = context.GetLogger("DailyDigest");
    logger.LogInformation("Daily digest triggered at {Time}", DateTime.UtcNow);
    // ... send digest emails
}
```

---

## 9. SocialCommerce — Where Functions Would Fit

The SocialCommerce project already uses
`BackgroundService` + Redis pub/sub for event processing (e.g.,
`NotificationService.EventSubscriber`, `AnalyticsService.OrderEventSubscriber`)
and `BusPublisher` for Service Bus publishing.

Azure Functions would let you extract those event-processing concerns into
dedicated, independently-scalable functions without keeping a full container
running 24/7 for them.

---

### 9a. Service Bus — Process Social Graph Events

**Current:** `SocialGraphService` publishes to the `social-events` Service Bus
topic via `BusPublisher`. Subscribers (if any) run inside long-lived containers.

**With a Function:** a Service Bus trigger fires per message, processes it, and
shuts down — zero idle cost.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace SocialCommerceFunctions;

public class SocialEventProcessor(ILogger<SocialEventProcessor> logger)
{
    // Triggered by every message on the "social-events" topic
    // subscription "functions-sub"
    [Function("ProcessSocialEvent")]
    public async Task Run(
        [ServiceBusTrigger(
            topicName: "social-events",
            subscriptionName: "functions-sub",
            Connection = "ServiceBusConn")]
        string messageBody)
    {
        using JsonDocument doc = JsonDocument.Parse(messageBody);
        string eventType = doc.RootElement.GetProperty("type").GetString() ?? "unknown";

        logger.LogInformation("Processing social event: {EventType}", eventType);

        switch (eventType)
        {
            case "user.followed":
                // update feed, send notification…
                break;
            case "friend.request.sent":
                // persist pending request, push real-time alert…
                break;
        }

        await Task.CompletedTask;
    }
}
```

---

### 9b. Blob Storage — Post-Upload Media Processing

**Current:** `MediaService` uploads files to Azure Blob Storage directly via
`AzureBlobStorage`. There is no automatic post-processing step.

**With a Function:** every new blob in the `media` container triggers
automatic thumbnail generation and metadata extraction.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace SocialCommerceFunctions;

public class MediaProcessor(ILogger<MediaProcessor> logger)
{
    // Fires for every new blob in the "media" container
    [Function("ProcessMediaUpload")]
    [BlobOutput("thumbnails/{name}", Connection = "StorageConn")]
    public async Task<byte[]> Run(
        [BlobTrigger("media/{name}", Connection = "StorageConn")]
        Stream blobStream,
        string name)
    {
        logger.LogInformation("Processing uploaded media: {Name}", name);

        using Image image = await Image.LoadAsync(blobStream);
        image.Mutate(ctx => ctx.Resize(320, 320));

        using MemoryStream output = new();
        await image.SaveAsJpegAsync(output);
        return output.ToArray();
        // Return value is automatically written to the "thumbnails" container
    }
}
```

---

### 9c. Timer — Nightly Analytics Rollup

**Current:** `AnalyticsService.OrderEventSubscriber` aggregates order events
in real time inside a `BackgroundService`. Daily/weekly summaries require
in-process scheduling.

**With a Function:** a timer trigger runs once per day to consolidate the day's
events into a summary table without keeping a container alive.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace SocialCommerceFunctions;

public class AnalyticsRollup(AppDbContext db, ILogger<AnalyticsRollup> logger)
{
    // Runs at 00:05 UTC every day
    [Function("NightlyAnalyticsRollup")]
    public async Task Run(
        [TimerTrigger("0 5 0 * * *")] TimerInfo timerInfo)
    {
        DateOnly yesterday = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));

        int count = await db.SalesSummaries
            .Where(s => s.Date == yesterday)
            .SumAsync(s => s.UnitsSold);

        logger.LogInformation(
            "Nightly rollup: {Date} — {Units} units sold", yesterday, count);

        // Persist or forward aggregated report…
    }
}
```

---

### 9d. HTTP — Internal Moderation Webhook

**Current:** `ModerationController` exposes REST endpoints and uses
`BusPublisher` to emit moderation decisions.

**With a Function:** an HTTP-triggered function acts as a lightweight webhook
that receives moderation callbacks from an external AI content-safety API
and writes decisions without a full ASP.NET Core stack.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using System.Text.Json;

namespace SocialCommerceFunctions;

public class ModerationWebhook(ILogger<ModerationWebhook> logger)
{
    [Function("ModerationCallback")]
    [ServiceBusOutput("moderation-results", Connection = "ServiceBusConn")]
    public async Task<string?> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "moderation/callback")]
        HttpRequestData req)
    {
        string body = await req.ReadAsStringAsync() ?? string.Empty;
        using JsonDocument doc = JsonDocument.Parse(body);

        string contentId = doc.RootElement.GetProperty("contentId").GetString() ?? "";
        string verdict   = doc.RootElement.GetProperty("verdict").GetString() ?? "";

        logger.LogInformation(
            "Moderation callback: content={ContentId} verdict={Verdict}", contentId, verdict);

        // Return value is forwarded to the Service Bus queue automatically
        return JsonSerializer.Serialize(new { contentId, verdict, processedAt = DateTime.UtcNow });
    }
}
```

---

### 9e. Timer — Auto-Stop PostgreSQL (Ops Automation)

A timer function can automate the stop/start lifecycle described in
[azure-services-budget.md](azure-services-budget.md) (Section 8) so you
never accidentally leave the database running overnight.

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.PostgreSql.FlexibleServers;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace SocialCommerceFunctions;

public class PostgreSqlScheduler(ILogger<PostgreSqlScheduler> logger)
{
    private const string SubscriptionId  = "<your-subscription-id>";
    private const string ResourceGroup   = "rg-socialcommerce";
    private const string ServerName      = "pgflex-socialcommerce";

    // Stop at 22:00 UTC (end of typical dev session)
    [Function("StopPostgreSQL")]
    public async Task Stop([TimerTrigger("0 0 22 * * *")] TimerInfo _)
    {
        await SetServerStateAsync(start: false);
        logger.LogInformation("PostgreSQL Flexible Server stopped at {Time}", DateTime.UtcNow);
    }

    // Start at 08:00 UTC (start of dev session)
    [Function("StartPostgreSQL")]
    public async Task Start([TimerTrigger("0 0 8 * * *")] TimerInfo _)
    {
        await SetServerStateAsync(start: true);
        logger.LogInformation("PostgreSQL Flexible Server started at {Time}", DateTime.UtcNow);
    }

    private static async Task SetServerStateAsync(bool start)
    {
        ArmClient armClient = new(new DefaultAzureCredential());
        PostgreSqlFlexibleServerResource server = armClient
            .GetPostgreSqlFlexibleServerResource(
                PostgreSqlFlexibleServerResource.CreateResourceIdentifier(
                    SubscriptionId, ResourceGroup, ServerName));

        if (start)
            await server.StartAsync(Azure.WaitUntil.Completed);
        else
            await server.StopAsync(Azure.WaitUntil.Completed);
    }
}
```

---

### Summary of SocialCommerce Function Candidates

| Function | Trigger | Replaces / Augments |
|---|---|---|
| `ProcessSocialEvent` | Service Bus Topic | Manual subscribers in long-lived containers |
| `ProcessMediaUpload` | Blob Storage | Manual post-processing step in `MediaService` |
| `NightlyAnalyticsRollup` | Timer (daily) | In-process scheduling in `AnalyticsService` |
| `ModerationCallback` | HTTP (webhook) | Extra endpoint in `ModerationController` |
| `StopPostgreSQL` / `StartPostgreSQL` | Timer (evening/morning) | Manual `az postgres flexible-server stop/start` |

---

## 10. Local Development

Azure Functions runs locally with the **Azure Functions Core Tools**
(`func`) CLI. It emulates the host, bindings, and trigger sources.

```bash
# Install Core Tools (one-time)
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Start the function app locally
cd SocialCommerceFunctions
func start
```

For Service Bus and Storage triggers you need either:
- **Azurite** — local emulator for Storage (`npx azurite`)
- **Real Azure resources** — connect via connection strings in `local.settings.json`

```json
// local.settings.json  (never commit this file)
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "ServiceBusConn": "<your-service-bus-connection-string>",
    "StorageConn": "<your-storage-connection-string>"
  }
}
```

**Tip:** For Service Bus triggers locally, point `ServiceBusConn` at your
real Azure Service Bus namespace. The Basic tier is ~$0.10/month so this
costs almost nothing during development.

---

## 11. Deployment

### Via Azure CLI

```bash
# Create Function App (Consumption plan, .NET 9 isolated)
az functionapp create \
  --resource-group rg-socialcommerce \
  --consumption-plan-location eastus \
  --runtime dotnet-isolated \
  --runtime-version 9 \
  --functions-version 4 \
  --name func-socialcommerce \
  --storage-account stsocialcommerce

# Deploy from local project folder
func azure functionapp publish func-socialcommerce
```

### Via GitHub Actions

Azure Static Web Apps and Function Apps both have first-class GitHub Actions
support. The Azure portal can generate the workflow YAML automatically when
you link a GitHub repo.

```yaml
- name: Deploy Azure Functions
  uses: Azure/functions-action@v1
  with:
    app-name: func-socialcommerce
    package: ./SocialCommerceFunctions
    publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

### Secrets in Key Vault

Reference Key Vault secrets directly in app settings:

```
ServiceBusConn = @Microsoft.KeyVault(VaultName=kv-socialcommerce;SecretName=ServiceBusConnString)
```

No secrets stored in environment variables or source code.

---

## 12. Cost at Personal Scale

Azure Functions Consumption plan has a **permanent free grant** per subscription:

| Meter | Free grant/month |
|---|---|
| Executions | 1,000,000 |
| GB-seconds | 400,000 |

At personal/portfolio usage (a few hundred invocations per day) you will
likely **never leave the free tier**.

| Scenario | Estimated cost |
|---|---|
| ProcessSocialEvent — 500 messages/day | $0 (within free tier) |
| ProcessMediaUpload — 50 uploads/day | $0 |
| NightlyAnalyticsRollup — 1/day | $0 |
| StopPostgreSQL + StartPostgreSQL — 2/day | $0 |
| **Total Functions cost** | **$0/month** |

The Function App requires a storage account for internal state (host logs,
timer state). Using the existing `stsocialcommerce` storage account adds
~$0.01-0.05/month.

---

## 13. When NOT to Use Azure Functions

| Situation | Better choice |
|---|---|
| Long-running stateful process (WebSocket server, SignalR hub) | Azure Container Apps (RealTimeHub stays as a container) |
| Sub-100ms latency requirement on every call | Container Apps with minReplicas ≥ 1 (avoids cold start) |
| Complex multi-step workflow with human approval | Durable Functions (extension of Azure Functions — still a good fit) |
| Serving a full REST API with many endpoints | ASP.NET Core in Azure Container Apps (better tooling, middleware pipeline) |
| High-frequency streaming (millions of events/min) | Azure Event Hubs + Stream Analytics |

---

## Further Reading

- [Azure Functions Overview — Microsoft Learn](https://learn.microsoft.com/azure/azure-functions/functions-overview)
- [Isolated Worker Model (.NET)](https://learn.microsoft.com/azure/azure-functions/dotnet-isolated-process-guide)
- [Trigger and Binding Reference](https://learn.microsoft.com/azure/azure-functions/functions-triggers-bindings)
- [Durable Functions](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-overview)
- [Azure Functions Pricing](https://azure.microsoft.com/pricing/details/functions/)
- [Flex Consumption Plan](https://learn.microsoft.com/azure/azure-functions/flex-consumption-plan)
