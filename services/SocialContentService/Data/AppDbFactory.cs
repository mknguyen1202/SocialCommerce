using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SocialContentService.Data
{
    public class AppDbFactory : IDesignTimeDbContextFactory<AppDb>
    {
        public AppDb CreateDbContext(string[] args)
        {
            DbContextOptions<AppDb> opts = new DbContextOptionsBuilder<AppDb>()
                .UseNpgsql("Host=localhost;Database=social_content_db;Username=postgres;Password=postgres")
                .UseSnakeCaseNamingConvention()
                .Options;
            return new AppDb(opts);
        }
    }
}
