using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FeedService.Data
{
    public class AppDbFactory : IDesignTimeDbContextFactory<AppDb>
    {
        public AppDb CreateDbContext(string[] args)
        {
            DbContextOptions<AppDb> opts = new DbContextOptionsBuilder<AppDb>()
                .UseNpgsql("Host=localhost;Database=feed_db;Username=postgres;Password=postgres")
                .Options;
            return new AppDb(opts);
        }
    }
}
