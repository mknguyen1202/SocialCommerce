using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocialContentService.Data;
using SocialContentService.Dtos;
using SocialContentService.Services;
using System.Security.Claims;

namespace SocialContentService.Controllers
{
    [ApiController]
    [Route("api/groups")]
    public class GroupsController : ControllerBase
    {
        private readonly AppDb _db; private readonly IBusPublisher _bus;
        public GroupsController(AppDb db, IBusPublisher bus) { _db = db; _bus = bus; }

        private Guid? CurrentUserId()
        {
            string? val = User.FindFirst("uid")?.Value ?? User.FindFirst("oid")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(val, out Guid g) ? g : null;
        }

        // GET /api/social/groups/discover
        [HttpGet("discover")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<object>> Discover([FromQuery] string? q, [FromQuery] string? cursor, [FromQuery] int take = 20)
        {
            take = Math.Clamp(take, 1, 100);
            DateTimeOffset? since = DecodeCursor(cursor) ?? DateTimeOffset.MaxValue;
            IQueryable<Group> query = _db.Groups.AsNoTracking()
                .Where(g => g.Visibility == "public" && g.CreatedAt < since);
            if (!string.IsNullOrWhiteSpace(q))
                query = query.Where(g => g.Name.Contains(q) || (g.Description != null && g.Description.Contains(q)));
            List<Group> rows = await query.OrderByDescending(g => g.MemberCount).ThenByDescending(g => g.CreatedAt).Take(take + 1).ToListAsync();
            string? next = rows.Count > take ? EncodeCursor(rows.Last().CreatedAt) : null;
            return Ok(new { items = rows.Take(take).Select(g => g.ToRead()), nextCursor = next });
        }

        // POST /api/social/groups
        [HttpPost]
        [Authorize(Policy = "social.write")]
        public async Task<ActionResult<GroupReadDto>> Create([FromBody] CreateGroupDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            if (await _db.Groups.AnyAsync(g => g.Slug == dto.Slug))
                return Conflict("Slug already in use.");

            Group group = new Group
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Slug = dto.Slug.ToLowerInvariant(),
                Description = dto.Description,
                Visibility = dto.Visibility,
                MemberCount = 1,
                CreatedBy = userId.Value,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _db.Groups.Add(group);
            _db.GroupMembers.Add(new GroupMember { GroupId = group.Id, UserId = userId.Value, Role = "owner" });
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { slug = group.Slug }, group.ToRead());
        }

        // GET /api/social/groups/{slug}
        [HttpGet("{slug}")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<GroupReadDto>> Get(string slug)
        {
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            return g is null ? NotFound() : Ok(g.ToRead());
        }

        // PATCH /api/social/groups/{slug}
        [HttpPatch("{slug}")]
        [Authorize(Policy = "social.write")]
        public async Task<ActionResult<GroupReadDto>> Update(string slug, [FromBody] UpdateGroupDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            if (!await IsModerator(g.Id, userId.Value)) return Forbid();

            if (dto.Name != null) g.Name = dto.Name;
            if (dto.Description != null) g.Description = dto.Description;
            if (dto.AvatarUrl != null) g.AvatarUrl = dto.AvatarUrl;
            if (dto.BannerUrl != null) g.BannerUrl = dto.BannerUrl;
            await _db.SaveChangesAsync();
            return Ok(g.ToRead());
        }

        // GET /api/social/groups/{slug}/posts
        [HttpGet("{slug}/posts")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<object>> GetPosts(string slug, [FromQuery] string? cursor, [FromQuery] int take = 20)
        {
            take = Math.Clamp(take, 1, 100);
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();

            DateTimeOffset? since = DecodeCursor(cursor) ?? DateTimeOffset.MaxValue;
            List<Post> rows = await _db.Posts.AsNoTracking()
                .Where(p => p.GroupId == g.Id && p.DeletedAt == null && !p.PendingReview && p.CreatedAt < since)
                .OrderByDescending(p => p.CreatedAt)
                .Take(take + 1)
                .ToListAsync();
            string? next = rows.Count > take ? EncodeCursor(rows.Last().CreatedAt) : null;
            return Ok(new { items = rows.Take(take).Select(p => p.ToRead()), nextCursor = next });
        }

        // POST /api/social/groups/{slug}/join
        [HttpPost("{slug}/join")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> Join(string slug)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            if (await _db.GroupBans.AnyAsync(b => b.GroupId == g.Id && b.UserId == userId.Value && (b.ExpiresAt == null || b.ExpiresAt > DateTimeOffset.UtcNow)))
                return Forbid();

            if (!await _db.GroupMembers.AnyAsync(m => m.GroupId == g.Id && m.UserId == userId.Value))
            {
                _db.GroupMembers.Add(new GroupMember { GroupId = g.Id, UserId = userId.Value, Role = "member" });
                g.MemberCount++;
                await _db.SaveChangesAsync();
            }
            return NoContent();
        }

        // POST /api/social/groups/{slug}/leave
        [HttpPost("{slug}/leave")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> Leave(string slug)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            GroupMember? membership = await _db.GroupMembers.FirstOrDefaultAsync(m => m.GroupId == g.Id && m.UserId == userId.Value);
            if (membership != null)
            {
                if (membership.Role == "owner") return BadRequest("Owner cannot leave. Transfer ownership first.");
                _db.GroupMembers.Remove(membership);
                g.MemberCount = Math.Max(0, g.MemberCount - 1);
                await _db.SaveChangesAsync();
            }
            return NoContent();
        }

        // GET /api/social/groups/{slug}/members
        [HttpGet("{slug}/members")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<IEnumerable<GroupMemberReadDto>>> GetMembers(string slug)
        {
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            List<GroupMember> members = await _db.GroupMembers.AsNoTracking().Where(m => m.GroupId == g.Id).ToListAsync();
            return Ok(members.Select(m => new GroupMemberReadDto(m.GroupId, m.UserId, m.Role, m.JoinedAt)));
        }

        // PATCH /api/social/groups/{slug}/members/{userId}/role
        [HttpPatch("{slug}/members/{memberId}/role")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> UpdateMemberRole(string slug, Guid memberId, [FromBody] UpdateMemberRoleDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            if (!await IsOwner(g.Id, userId.Value)) return Forbid();

            GroupMember? member = await _db.GroupMembers.FirstOrDefaultAsync(m => m.GroupId == g.Id && m.UserId == memberId);
            if (member is null) return NotFound();
            if (member.Role == "owner") return BadRequest("Cannot change owner role.");
            member.Role = dto.Role;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // POST /api/social/groups/{slug}/ban/{userId}
        [HttpPost("{slug}/ban/{targetUserId}")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> BanUser(string slug, Guid targetUserId, [FromBody] BanUserDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            if (!await IsModerator(g.Id, userId.Value)) return Forbid();

            GroupBan? existing = await _db.GroupBans.FirstOrDefaultAsync(b => b.GroupId == g.Id && b.UserId == targetUserId);
            if (existing is null)
                _db.GroupBans.Add(new GroupBan { GroupId = g.Id, UserId = targetUserId, BannedBy = userId.Value, Reason = dto.Reason, ExpiresAt = dto.ExpiresAt });
            else
            { existing.Reason = dto.Reason; existing.ExpiresAt = dto.ExpiresAt; existing.BannedBy = userId.Value; }

            // Remove membership
            GroupMember? membership = await _db.GroupMembers.FirstOrDefaultAsync(m => m.GroupId == g.Id && m.UserId == targetUserId);
            if (membership != null) { _db.GroupMembers.Remove(membership); g.MemberCount = Math.Max(0, g.MemberCount - 1); }
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/social/groups/{slug}/bans
        [HttpGet("{slug}/bans")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<IEnumerable<GroupBanReadDto>>> GetBans(string slug)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            if (!await IsModerator(g.Id, userId.Value)) return Forbid();
            List<GroupBan> bans = await _db.GroupBans.AsNoTracking().Where(b => b.GroupId == g.Id).ToListAsync();
            return Ok(bans.Select(b => new GroupBanReadDto(b.GroupId, b.UserId, b.BannedBy, b.Reason, b.ExpiresAt, b.CreatedAt)));
        }

        // GET /api/social/groups/{slug}/rules
        [HttpGet("{slug}/rules")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<IEnumerable<GroupRuleDto>>> GetRules(string slug)
        {
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            List<GroupRule> rules = await _db.GroupRules.AsNoTracking().Where(r => r.GroupId == g.Id).OrderBy(r => r.DisplayOrder).ToListAsync();
            return Ok(rules.Select(r => new GroupRuleDto(r.Id, r.GroupId, r.Title, r.Description, r.DisplayOrder)));
        }

        // PUT /api/social/groups/{slug}/rules
        [HttpPut("{slug}/rules")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> ReplaceRules(string slug, [FromBody] ReplaceRulesDto dto)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            if (!await IsModerator(g.Id, userId.Value)) return Forbid();

            List<GroupRule> existing = await _db.GroupRules.Where(r => r.GroupId == g.Id).ToListAsync();
            _db.GroupRules.RemoveRange(existing);
            int order = 0;
            foreach (GroupRuleDto rule in dto.Rules)
                _db.GroupRules.Add(new GroupRule { Id = Guid.NewGuid(), GroupId = g.Id, Title = rule.Title, Description = rule.Description, DisplayOrder = order++ });
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/social/groups/{slug}/moderation/queue — pending posts awaiting review
        [HttpGet("{slug}/moderation/queue")]
        [Authorize(Policy = "social.read")]
        public async Task<ActionResult<object>> ModerationQueue(string slug, [FromQuery] string? cursor, [FromQuery] int take = 20)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            if (!await IsModerator(g.Id, userId.Value)) return Forbid();

            take = Math.Clamp(take, 1, 100);
            DateTimeOffset? since = DecodeCursor(cursor) ?? DateTimeOffset.MaxValue;
            List<Post> rows = await _db.Posts.AsNoTracking()
                .Where(p => p.GroupId == g.Id && p.PendingReview && p.DeletedAt == null && p.CreatedAt < since)
                .OrderByDescending(p => p.CreatedAt)
                .Take(take + 1)
                .ToListAsync();
            string? next = rows.Count > take ? EncodeCursor(rows.Last().CreatedAt) : null;
            return Ok(new { items = rows.Take(take).Select(p => p.ToRead()), nextCursor = next });
        }

        // POST /api/social/groups/{slug}/moderation/{postId}/approve
        [HttpPost("{slug}/moderation/{postId}/approve")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> ApprovePost(string slug, Guid postId)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            if (!await IsModerator(g.Id, userId.Value)) return Forbid();

            Post? post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == postId && p.GroupId == g.Id);
            if (post is null) return NotFound();
            post.PendingReview = false;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // POST /api/social/groups/{slug}/moderation/{postId}/remove
        [HttpPost("{slug}/moderation/{postId}/remove")]
        [Authorize(Policy = "social.write")]
        public async Task<IActionResult> RemovePost(string slug, Guid postId)
        {
            Guid? userId = CurrentUserId();
            if (userId is null) return Unauthorized();
            Group? g = await _db.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug);
            if (g is null) return NotFound();
            if (!await IsModerator(g.Id, userId.Value)) return Forbid();

            Post? post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == postId && p.GroupId == g.Id);
            if (post is null) return NotFound();
            post.DeletedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        private Task<bool> IsModerator(Guid groupId, Guid userId) =>
            _db.GroupMembers.AnyAsync(m => m.GroupId == groupId && m.UserId == userId && (m.Role == "owner" || m.Role == "moderator"));

        private Task<bool> IsOwner(Guid groupId, Guid userId) =>
            _db.GroupMembers.AnyAsync(m => m.GroupId == groupId && m.UserId == userId && m.Role == "owner");

        private static string EncodeCursor(DateTimeOffset t) =>
            Convert.ToBase64String(BitConverter.GetBytes(t.ToUnixTimeMilliseconds()));
        private static DateTimeOffset? DecodeCursor(string? c)
        {
            if (string.IsNullOrWhiteSpace(c)) return null;
            try { long ms = BitConverter.ToInt64(Convert.FromBase64String(c)); return DateTimeOffset.FromUnixTimeMilliseconds(ms); }
            catch { return null; }
        }
    }
}
