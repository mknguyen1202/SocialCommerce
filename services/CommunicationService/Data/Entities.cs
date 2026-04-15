namespace CommunicationService.Data;

public class Conversation
{
    public Guid Id { get; set; }
    public string Type { get; set; } = "dm";   // 'dm' | 'room'
    public string? Name { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }

    public ICollection<ConversationParticipant> Participants { get; set; } = [];
    public ICollection<Message> Messages { get; set; } = [];
    public ICollection<PinnedMessage> PinnedMessages { get; set; } = [];
}

public class ConversationParticipant
{
    public Guid ConversationId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = "member";  // 'owner' | 'admin' | 'member'
    public DateTimeOffset JoinedAt { get; set; }
    public DateTimeOffset LastReadAt { get; set; }

    public Conversation Conversation { get; set; } = null!;
}

public class Message
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid? ReplyToId { get; set; }
    public DateTimeOffset? EditedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Conversation Conversation { get; set; } = null!;
    public ICollection<MessageAttachment> Attachments { get; set; } = [];
    public ICollection<MessageReaction> Reactions { get; set; } = [];
}

public class MessageAttachment
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public Guid MediaId { get; set; }
    public string Type { get; set; } = "file";  // 'image' | 'video' | 'audio' | 'file'

    public Message Message { get; set; } = null!;
}

public class MessageReaction
{
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public string Emoji { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public Message Message { get; set; } = null!;
}

public class PinnedMessage
{
    public Guid ConversationId { get; set; }
    public Guid MessageId { get; set; }
    public Guid PinnedBy { get; set; }
    public DateTimeOffset PinnedAt { get; set; }

    public Conversation Conversation { get; set; } = null!;
    public Message Message { get; set; } = null!;
}
