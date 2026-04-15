using Microsoft.EntityFrameworkCore;


namespace FeedService.Data
{
    public class AppDb : DbContext
    {
        public AppDb(DbContextOptions<AppDb> o) : base(o) { }
        public DbSet<Timeline> Timelines => Set<Timeline>();
        public DbSet<Marker> Markers => Set<Marker>();


        protected override void OnModelCreating(ModelBuilder m)
        {
            m.Entity<Timeline>().HasKey(x => new { x.UserId, x.PostId });
            m.Entity<Timeline>().HasIndex(x => x.UserId);
            m.Entity<Timeline>().HasIndex(x => x.CreatedAt);
        }
    }
}