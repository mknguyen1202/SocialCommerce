using Microsoft.EntityFrameworkCore;

namespace SocialContentService.Data
{
    public class AppDb : DbContext
    {
        public AppDb(DbContextOptions<AppDb> o) : base(o) { }

        public DbSet<Post> Posts => Set<Post>();
        public DbSet<PostMedia> PostMedia => Set<PostMedia>();
        public DbSet<PostVote> PostVotes => Set<PostVote>();
        public DbSet<PostSave> PostSaves => Set<PostSave>();
        public DbSet<Comment> Comments => Set<Comment>();
        public DbSet<CommentVote> CommentVotes => Set<CommentVote>();
        public DbSet<Reaction> Reactions => Set<Reaction>();
        public DbSet<Poll> Polls => Set<Poll>();
        public DbSet<PollOption> PollOptions => Set<PollOption>();
        public DbSet<PollVote> PollVotes => Set<PollVote>();
        public DbSet<Group> Groups => Set<Group>();
        public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
        public DbSet<GroupRule> GroupRules => Set<GroupRule>();
        public DbSet<GroupBan> GroupBans => Set<GroupBan>();

        protected override void OnModelCreating(ModelBuilder m)
        {
            m.HasPostgresEnum<Visibility>();

            m.Entity<Post>(e =>
            {
                e.HasIndex(x => x.AuthorUserId);
                e.HasIndex(x => x.GroupId);
                e.HasIndex(x => x.CreatedAt);
                e.Property(x => x.Media).HasColumnType("jsonb");
                e.Property(x => x.ProductRef).HasColumnType("jsonb");
            });

            m.Entity<PostMedia>(e =>
            {
                e.HasKey(x => new { x.PostId, x.MediaId });
                e.HasIndex(x => x.PostId);
            });

            m.Entity<PostVote>(e =>
            {
                e.HasKey(x => new { x.PostId, x.UserId });
                e.HasIndex(x => x.PostId);
            });

            m.Entity<PostSave>(e =>
            {
                e.HasKey(x => new { x.PostId, x.UserId });
                e.HasIndex(x => x.UserId);
            });

            m.Entity<Comment>(e =>
            {
                e.HasIndex(x => x.PostId);
                e.HasIndex(x => x.ParentId);
            });

            m.Entity<CommentVote>(e =>
            {
                e.HasKey(x => new { x.CommentId, x.UserId });
                e.HasIndex(x => x.CommentId);
            });

            m.Entity<Reaction>(e =>
            {
                e.HasKey(x => new { x.PostId, x.UserId });
                e.HasIndex(x => x.PostId);
                e.Property(x => x.Kind).HasMaxLength(24);
            });

            m.Entity<Poll>(e =>
            {
                e.HasIndex(x => x.PostId).IsUnique();
            });

            m.Entity<PollVote>(e =>
            {
                e.HasKey(x => new { x.PollId, x.UserId });
            });

            m.Entity<Group>(e =>
            {
                e.HasIndex(x => x.Slug).IsUnique();
                e.HasIndex(x => x.CreatedBy);
            });

            m.Entity<GroupMember>(e =>
            {
                e.HasKey(x => new { x.GroupId, x.UserId });
                e.HasIndex(x => x.UserId);
            });

            m.Entity<GroupBan>(e =>
            {
                e.HasKey(x => new { x.GroupId, x.UserId });
            });
        }
    }
}