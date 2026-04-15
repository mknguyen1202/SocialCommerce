using Azure.Messaging.ServiceBus;
using System.Text.Json;

namespace SocialGraphService.Services
{
    public interface IBusPublisher
    {
        Task PublishAsync(string type, object payload, CancellationToken ct = default);
    }

    public class BusPublisher : IBusPublisher
    {
        private readonly ServiceBusSender? _sender;
        public BusPublisher(ServiceBusClient? client, IConfiguration cfg)
        {
            string topic = cfg["ServiceBus:Topic"] ?? throw new InvalidOperationException("ServiceBus:Topic missing");
            _sender = client.CreateSender(topic);
        }
        public async Task PublishAsync(string type, object payload, CancellationToken ct = default)
        {
            if (_sender == null) return; // dev w/o bus
            byte[] body = JsonSerializer.SerializeToUtf8Bytes(payload);
            ServiceBusMessage msg = new ServiceBusMessage(body) { Subject = type, ContentType = "application/json" };
            msg.ApplicationProperties["type"] = type;
            await _sender.SendMessageAsync(msg, ct);
        }
    }

    public sealed class NoopBusPublisher : IBusPublisher
    {
        public Task PublishAsync(string type, object payload, CancellationToken ct = default) => Task.CompletedTask;
    }
}