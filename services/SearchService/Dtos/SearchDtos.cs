namespace SearchService.Dtos;

public record PagedResult<T>(IEnumerable<T> Items, string? NextCursor, bool HasMore);

public record SearchResultDto(
    string EntityType,
    Guid EntityId,
    string Title,
    string? Body,
    string? DomainData,
    DateTimeOffset UpdatedAt);

public record SearchRequest
{
    public string Q { get; init; } = string.Empty;
    public string? Type { get; init; }
    public string? Cursor { get; init; }
    public int Limit { get; init; } = 20;
}

/// <summary>DTO used by other services to upsert a search entry via the internal API.</summary>
public record UpsertSearchEntryDto(
    string EntityType,
    Guid EntityId,
    string Title,
    string? Body,
    string? DomainData);

/// <summary>DTO used by other services to delete a search entry via the internal API.</summary>
public record DeleteSearchEntryDto(
    string EntityType,
    Guid EntityId);
