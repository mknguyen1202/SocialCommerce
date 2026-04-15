using System.Text.Json;

namespace RealTimeHub.Models;

public sealed record PublishRequest(
    string Group,
    string Event,
    JsonElement Payload
);
