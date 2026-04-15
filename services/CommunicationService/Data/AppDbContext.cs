using CommunicationService.Data;
using Microsoft.EntityFrameworkCore;

namespace CommunicationService.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<PinnedMessage> PinnedMessages => Set<PinnedMessage>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("uuid-ossp");

        model.Entity<Conversation>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Type).HasMaxLength(4).IsRequired();
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.AvatarUrl).HasMaxLength(512);
        });

        model.Entity<ConversationParticipant>(e =>
        {
            e.HasKey(x => new { x.ConversationId, x.UserId });
            e.Property(x => x.Role).HasMaxLength(10).IsRequired();
            e.HasOne(x => x.Conversation)
                .WithMany(c => c.Participants)
                .HasForeignKey(x => x.ConversationId);
        });

        model.Entity<Message>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Content).IsRequired();
            e.HasOne(x => x.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(x => x.ConversationId);
            e.HasIndex(x => new { x.ConversationId, x.CreatedAt });
        });

        model.Entity<MessageAttachment>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasDefaultValueSql("uuid_generate_v4()");
            e.Property(x => x.Type).HasMaxLength(10).IsRequired();
            e.HasOne(x => x.Message)
                .WithMany(m => m.Attachments)
                .HasForeignKey(x => x.MessageId);
        });

        model.Entity<MessageReaction>(e =>
        {
            e.HasKey(x => new { x.MessageId, x.UserId, x.Emoji });
            e.Property(x => x.Emoji).HasMaxLength(10).IsRequired();
            e.HasOne(x => x.Message)
                .WithMany(m => m.Reactions)
                .HasForeignKey(x => x.MessageId);
        });

        model.Entity<PinnedMessage>(e =>
        {
            e.HasKey(x => new { x.ConversationId, x.MessageId });
            e.HasOne(x => x.Conversation)
                .WithMany(c => c.PinnedMessages)
                .HasForeignKey(x => x.ConversationId);
            e.HasOne(x => x.Message)
                .WithMany()
                .HasForeignKey(x => x.MessageId);
        });
    }
}
