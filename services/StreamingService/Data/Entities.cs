namespace StreamingService.Data;

public class Theater
{
    public Guid Id { get; set; }
    public Guid HostId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string[] Tags { get; set; } = [];
    public string Visibility { get; set; } = "public";    // public|private|friends
    public string Status { get; set; } = "created";       // created|scheduled|live|paused|ended
    public string SourceType { get; set; } = "screen_share"; // screen_share|media_upload|external_url
    public string? SourceUrl { get; set; }
    public Guid? SourceMediaId { get; set; }
    public int ViewerCount { get; set; }
    public int? MaxViewers { get; set; }
    public DateTimeOffset? ScheduledAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<TheaterParticipant> Participants { get; set; } = [];
    public ICollection<TheaterChatMessage> ChatMessages { get; set; } = [];
    public PlaybackState? PlaybackState { get; set; }
    public ICollection<Emote> Emotes { get; set; } = [];
}

public class TheaterParticipant
{
    public Guid TheaterId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = "viewer";    // host|moderator|viewer
    public DateTimeOffset JoinedAt { get; set; }
    public DateTimeOffset? LeftAt { get; set; }
    public bool IsChatMuted { get; set; }

    public Theater Theater { get; set; } = null!;
}

public class TheaterChatMessage
{
    public Guid Id { get; set; }
    public Guid TheaterId { get; set; }
    public Guid SenderId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public bool IsDeleted { get; set; }

    public Theater Theater { get; set; } = null!;
}

public class PlaybackState
{
    public Guid TheaterId { get; set; }
    public float PositionSeconds { get; set; }
    public bool IsPlaying { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Theater Theater { get; set; } = null!;
}

public class Emote
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Category { get; set; } = "global";   // global|theater
    public Guid? TheaterId { get; set; }
    public Guid CreatedBy { get; set; }

    public Theater? Theater { get; set; }
}
