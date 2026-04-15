using Microsoft.EntityFrameworkCore;

namespace SocialGraphService.Data
{
    public class AppDb : DbContext
    {
        public AppDb(DbContextOptions<AppDb> o) : base(o) { }
        public DbSet<Follow> Follows => Set<Follow>();
        public DbSet<Block> Blocks => Set<Block>();
        public DbSet<FriendRequest> FriendRequests => Set<FriendRequest>();

        protected override void OnModelCreating(ModelBuilder m)
        {
            m.Entity<Follow>().HasKey(x => new { x.FollowerUserId, x.FolloweeUserId });
            m.Entity<Follow>().HasIndex(x => x.FolloweeUserId);
            m.Entity<Follow>().HasIndex(x => x.FollowerUserId);

            m.Entity<Block>().HasKey(x => new { x.BlockerUserId, x.BlockedUserId });
            m.Entity<Block>().HasIndex(x => x.BlockerUserId);
            m.Entity<Block>().HasIndex(x => x.BlockedUserId);

            m.Entity<FriendRequest>(e =>
            {
                e.HasIndex(x => new { x.ReceiverId, x.Status });
                e.HasIndex(x => new { x.SenderId, x.ReceiverId }).IsUnique();
            });
        }
    }
}
