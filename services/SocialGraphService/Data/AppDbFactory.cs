using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SocialGraphService.Data
{
    public class AppDbFactory : IDesignTimeDbContextFactory<AppDb>
    {
        public AppDb CreateDbContext(string[] args)
        {
            DbContextOptions<AppDb> opts = new DbContextOptionsBuilder<AppDb>()
                .UseNpgsql("Host=localhost;Database=social_graph_db;Username=postgres;Password=postgres")
                .Options;
            return new AppDb(opts);
        }
    }
}
