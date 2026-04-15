using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ModerationService.Data
{
    public class AppDbFactory : IDesignTimeDbContextFactory<AppDb>
    {
        public AppDb CreateDbContext(string[] args)
        {
            DbContextOptions<AppDb> opts = new DbContextOptionsBuilder<AppDb>()
                .UseNpgsql("Host=localhost;Database=moderation_db;Username=postgres;Password=postgres")
                .Options;
            return new AppDb(opts);
        }
    }
}
