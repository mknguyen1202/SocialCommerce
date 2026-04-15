using Azure.Messaging.ServiceBus;
using FeedService.Data;
using Microsoft.EntityFrameworkCore;

namespace FeedService.Services
{
    public class EventSubscriber : BackgroundService
    {
        private readonly ILogger<EventSubscriber> _log;
        private readonly IServiceProvider _sp;
        private readonly ServiceBusProcessor? _proc;

        public EventSubscriber(ILogger<EventSubscriber> log, IServiceProvider sp, IConfiguration cfg, ServiceBusClient? sb)
        {
            _log = log; _sp = sp;
            string? topic = cfg["ServiceBus:Topic"]; string? sub = cfg["ServiceBus:Subscription"];
            if (!string.IsNullOrWhiteSpace(topic) && !string.IsNullOrWhiteSpace(sub) && sb != null)
            {
                _proc = sb.CreateProcessor(topic, sub, new ServiceBusProcessorOptions
                {
                    AutoCompleteMessages = false,
                    MaxConcurrentCalls = 2
                });
                _proc.ProcessMessageAsync += OnMsg;
                _proc.ProcessErrorAsync += OnErr;
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (_proc != null)
            {
                await _proc.StartProcessingAsync(stoppingToken);
                _log.LogInformation("FeedService subscriber started.");
            }
        }

        private async Task OnMsg(ProcessMessageEventArgs arg)
        {
            string? type = arg.Message.ApplicationProperties.TryGetValue("type", out var t) ? t?.ToString() : arg.Message.Subject;
            try
            {
                using IServiceScope scope = _sp.CreateScope();
                AppDb db = scope.ServiceProvider.GetRequiredService<AppDb>();

                // Deserialize payload
                System.Text.Json.JsonDocument json = System.Text.Json.JsonDocument.Parse(arg.Message.Body);
                System.Text.Json.JsonElement root = json.RootElement;

                switch (type)
                {
                    case "post.created":
                        {
                            Guid postId = root.GetProperty("postId").GetGuid();
                            Guid authorId = root.GetProperty("authorUserId").GetGuid();
                            DateTimeOffset createdAt = root.TryGetProperty("createdAt", out var ca)
                                ? ca.GetDateTimeOffset()
                                : DateTimeOffset.UtcNow;

                            IGraphClient graph = scope.ServiceProvider.GetRequiredService<IGraphClient>();
                            HashSet<Guid> followers = await graph.GetFollowersAsync(authorId, arg.CancellationToken);

                            if (followers.Count > 0)
                            {
                                IFeedBuilder builder = scope.ServiceProvider.GetRequiredService<IFeedBuilder>();
                                await builder.UpsertFanoutAsync(authorId, postId, createdAt, followers, arg.CancellationToken);
                            }
                            break;
                        }
                    case "user.followed":
                        {
                            // Optional: backfill recent posts from followee into follower timeline
                            break;
                        }
                    case "content.removed":
                        {
                            string? targetType = root.GetProperty("targetType").GetString();
                            if (string.Equals(targetType, "post", StringComparison.OrdinalIgnoreCase))
                            {
                                Guid postId = root.GetProperty("targetId").GetGuid();
                                await db.Timelines.Where(t => t.PostId == postId).ExecuteDeleteAsync();
                            }
                            break;
                        }
                }

                await arg.CompleteMessageAsync(arg.Message);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Error handling event {Type}", type);
                await arg.AbandonMessageAsync(arg.Message);
            }
        }

        private Task OnErr(ProcessErrorEventArgs arg)
        {
            _log.LogError(arg.Exception, "Service Bus processor error: {ErrorSource}", arg.ErrorSource);
            return Task.CompletedTask;
        }

        public override async void Dispose()
        {
            if (_proc != null) await _proc.DisposeAsync();
            base.Dispose();
        }
    }
}