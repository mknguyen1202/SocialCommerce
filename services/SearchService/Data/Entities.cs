using NpgsqlTypes;

namespace SearchService.Data;

/// <summary>
/// Unified search index entry. Each row represents one searchable entity
/// across any domain (user, post, group, theater, product).
/// Uses PostgreSQL full-text search with tsvector.
/// </summary>
public class SearchEntry
{
    public Guid Id { get; set; }

    /// <summary>Entity type: user, post, group, theater, product.</summary>
    public string EntityType { get; set; } = string.Empty;

    /// <summary>Primary key of the entity in its source service.</summary>
    public Guid EntityId { get; set; }

    /// <summary>Primary searchable text (name, title, etc.).</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Secondary searchable text (description, body, etc.).</summary>
    public string? Body { get; set; }

    /// <summary>
    /// PostgreSQL tsvector column — auto-populated by a database trigger
    /// from Title + Body columns using <c>english</c> text search config.
    /// </summary>
    public NpgsqlTsVector SearchVector { get; set; } = null!;

    /// <summary>
    /// Type-specific metadata stored as JSONB for result enrichment
    /// (e.g., avatarUrl, price, memberCount).
    /// </summary>
    public string? DomainData { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
