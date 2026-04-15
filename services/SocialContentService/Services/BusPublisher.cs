using Azure.Messaging.ServiceBus;
using System.Text.Json;


namespace SocialContentService.Services
{
    public interface IBusPublisher
    {
        Task PublishAsync(string type, object payload, CancellationToken ct = default);
    }


    public class BusPublisher : IBusPublisher
    {
        private readonly ServiceBusSender _sender;
        public BusPublisher(ServiceBusClient client, IConfiguration cfg)
        {
            _sender = client.CreateSender(cfg["ServiceBus:Topic"]!);
        }
        public Task PublishAsync(string type, object payload, CancellationToken ct = default)
        {
            byte[] body = JsonSerializer.SerializeToUtf8Bytes(payload);
            ServiceBusMessage msg = new ServiceBusMessage(body)
            {
                Subject = type,
                ContentType = "application/json"
            };
            msg.ApplicationProperties["type"] = type;
            return _sender.SendMessageAsync(msg, ct);
        }
    }
}