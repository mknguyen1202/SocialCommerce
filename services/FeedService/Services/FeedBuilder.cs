using FeedService.Data;
using Microsoft.EntityFrameworkCore;

namespace FeedService.Services
{
    public interface IFeedBuilder
    {
        Task<List<Timeline>> GetHomeAsync(Guid me, DateTimeOffset before, int take, CancellationToken ct);
        Task<List<Timeline>> GetUserAsync(Guid userId, DateTimeOffset before, int take, CancellationToken ct);
        Task UpsertFanoutAsync(Guid authorId, Guid postId, DateTimeOffset createdAt, IEnumerable<Guid> followerIds, CancellationToken ct);
    }

    public class FeedBuilder : IFeedBuilder
    {
        private readonly AppDb _db;
        public FeedBuilder(AppDb db) { _db = db; }

        public Task<List<Timeline>> GetHomeAsync(Guid me, DateTimeOffset before, int take, CancellationToken ct)
            => _db.Timelines.AsNoTracking()
                .Where(t => t.UserId == me && t.CreatedAt < before)
                .OrderByDescending(t => t.CreatedAt)
                .ThenByDescending(t => t.Rank)
                .Take(take)
                .ToListAsync(ct);

        public Task<List<Timeline>> GetUserAsync(Guid userId, DateTimeOffset before, int take, CancellationToken ct)
            => _db.Timelines.AsNoTracking()
                .Where(t => t.UserId == userId && t.CreatedAt < before)
                .OrderByDescending(t => t.CreatedAt)
                .ThenByDescending(t => t.Rank)
                .Take(take)
                .ToListAsync(ct);

        public async Task UpsertFanoutAsync(Guid authorId, Guid postId, DateTimeOffset createdAt, IEnumerable<Guid> followerIds, CancellationToken ct)
        {
            // Simple rank: recency. Later, mix-in social/quality signals.
            IEnumerable<Timeline> rows = followerIds.Select(fid => new Timeline
            {
                UserId = fid,
                PostId = postId,
                Rank = createdAt.ToUnixTimeMilliseconds(),
                CreatedAt = createdAt
            });
            // bulk-ish insert; EF will batch
            await _db.Timelines.AddRangeAsync(rows, ct);
            await _db.SaveChangesAsync(ct);
        }
    }
}