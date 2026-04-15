using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModerationService.Data;
using ModerationService.Dtos;
using ModerationService.Services;
using System.Text.Json;

namespace ModerationService.Controllers
{
    [ApiController]
    [Route("api/moderation")]
    public class ModerationController : ControllerBase
    {
        private readonly AppDb _db; private readonly IBusPublisher _bus; private readonly IDecisionCache _cache; private readonly ILogger<ModerationController> _log;
        public ModerationController(AppDb db, IBusPublisher bus, IDecisionCache cache, ILogger<ModerationController> log) { _db = db; _bus = bus; _cache = cache; _log = log; }

        // --- Reports ---
        [HttpPost("report")] // public endpoint
        public async Task<ActionResult<ReportRead>> Report([FromBody] CreateReport dto, CancellationToken ct)
        {
            Report r = new Report
            {
                ReporterUserId = dto.ReporterUserId,
                TargetType = Normalize(dto.TargetType),
                TargetId = dto.TargetId,
                Reason = dto.Reason,
                DetailsJson = dto.Details == null ? null : JsonSerializer.Serialize(dto.Details)
            };
            _db.Reports.Add(r);
            await _db.SaveChangesAsync(ct);
            return CreatedAtAction(nameof(GetReport), new { id = r.Id }, new ReportRead(r.Id, r.ReporterUserId, r.TargetType, r.TargetId, r.Reason, r.Status, r.CreatedAt));
        }

        [HttpGet("report/{id}")] // staff
        public async Task<ActionResult<ReportRead>> GetReport(Guid id, CancellationToken ct)
        {
            Report? r = await _db.Reports.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (r == null) return NotFound();
            return new ReportRead(r.Id, r.ReporterUserId, r.TargetType, r.TargetId, r.Reason, r.Status, r.CreatedAt);
        }

        // --- Decisions (staff/system) ---
        [HttpPost("decision")] // staff
        public async Task<ActionResult<DecisionRead>> Decide([FromBody] CreateDecision dto, CancellationToken ct)
        {
            string t = Normalize(dto.TargetType);
            Decision d = new Decision
            {
                TargetType = t,
                TargetId = dto.TargetId,
                Action = dto.Action.ToLowerInvariant(),
                ActorUserId = dto.ActorUserId,
                Ttl = dto.TtlMinutes.HasValue ? TimeSpan.FromMinutes(dto.TtlMinutes.Value) : null,
                Notes = dto.Notes
            };

            _db.Decisions.Add(d);
            _db.AuditLogs.Add(new AuditLog { Who = dto.ActorUserId, Action = "decision.create", SubjectType = t, SubjectId = dto.TargetId, DetailsJson = JsonSerializer.Serialize(dto) });
            await _db.SaveChangesAsync(ct);

            // Cache for fast enforcement
            await _cache.CacheDecisionAsync(t, dto.TargetId, d.Action, d.Ttl);

            // Emit enforcement
            switch (t)
            {
                case "post":
                case "comment":
                    if (d.Action is "remove" or "restrict")
                        await _bus.PublishAsync("content.removed", new { targetType = t, targetId = dto.TargetId, reason = d.Action, at = d.CreatedAt }, ct);
                    break;
                case "user":
                    if (d.Action is "ban" or "shadow" or "restrict")
                        await _bus.PublishAsync("user.restricted", new { userId = dto.TargetId, mode = d.Action, until = d.Ttl.HasValue ? DateTimeOffset.UtcNow.Add(d.Ttl.Value) : (DateTimeOffset?)null }, ct);
                    break;
            }

            return CreatedAtAction(nameof(GetDecision), new { id = d.Id }, ToRead(d));
        }

        [HttpGet("decision/{id}")] // staff
        public async Task<ActionResult<DecisionRead>> GetDecision(Guid id, CancellationToken ct)
        {
            Decision? d = await _db.Decisions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (d == null) return NotFound();
            return ToRead(d);
        }

        [HttpGet("decisions")] // staff query by target
        public async Task<ActionResult<IEnumerable<DecisionRead>>> Decisions([FromQuery] string targetType, [FromQuery] Guid targetId, CancellationToken ct)
        {
            string t = Normalize(targetType);
            IQueryable<Decision> q = _db.Decisions.AsNoTracking().Where(x => x.TargetType == t && x.TargetId == targetId).OrderByDescending(x => x.CreatedAt);
            List<Decision> rows = await q.ToListAsync(ct);
            return rows.Select(ToRead).ToList();
        }

        // --- Decision lookup for enforcement (public to trusted services) ---
        [HttpGet("enforcement/{targetType}/{targetId}")] // used by gateway/services to enforce visibility
        public async Task<ActionResult<object>> Enforcement(string targetType, Guid targetId)
        {
            string t = Normalize(targetType);
            string? cached = await _cache.GetDecisionAsync(t, targetId);
            if (!string.IsNullOrEmpty(cached)) return Ok(new { action = cached, cached = true });

            Decision? d = await _db.Decisions.AsNoTracking().Where(x => x.TargetType == t && x.TargetId == targetId)
                .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync();
            if (d == null) return Ok(new { action = (string?)null, cached = false });
            await _cache.CacheDecisionAsync(t, targetId, d.Action, d.Ttl);
            return Ok(new { action = d.Action, cached = false });
        }

        // --- Moderation queue ---
        [HttpGet("queue")]
        public async Task<ActionResult<IEnumerable<QueueItem>>> Queue(
            [FromQuery] string? contentType, [FromQuery] int take = 50, [FromQuery] int skip = 0, CancellationToken ct = default)
        {
            take = Math.Clamp(take, 1, 200);
            IQueryable<Report> q = _db.Reports.AsNoTracking().Where(r => r.Status == "open");
            if (!string.IsNullOrWhiteSpace(contentType))
                q = q.Where(r => r.TargetType == Normalize(contentType));

            List<Report> rows = await q.OrderBy(r => r.CreatedAt).Skip(skip).Take(take).ToListAsync(ct);
            return Ok(rows.Select(r => new QueueItem(r.Id, r.ReporterUserId, r.TargetType, r.TargetId, r.Reason, r.CreatedAt)));
        }

        // --- Apply action to a report ---
        [HttpPost("{reportId}/action")]
        public async Task<ActionResult<ModerationActionRead>> ApplyAction(Guid reportId, [FromBody] ApplyActionRequest dto, CancellationToken ct)
        {
            Report? report = await _db.Reports.FindAsync([reportId], ct);
            if (report == null) return NotFound();

            ModerationAction action = new ModerationAction
            {
                ReportId = reportId,
                ModeratorId = dto.ModeratorId,
                TargetType = report.TargetType,
                TargetId = report.TargetId,
                Action = dto.Action.ToLowerInvariant(),
                Reason = dto.Reason
            };

            report.Status = dto.Action.ToLowerInvariant() == "dismiss" ? "dismissed" : "actioned";
            report.ReviewedBy = dto.ModeratorId;
            report.ReviewedAt = DateTimeOffset.UtcNow;

            _db.ModerationActions.Add(action);
            _db.AuditLogs.Add(new AuditLog
            {
                Who = dto.ModeratorId,
                Action = "action.apply",
                SubjectType = report.TargetType,
                SubjectId = report.TargetId,
                DetailsJson = System.Text.Json.JsonSerializer.Serialize(dto)
            });
            await _db.SaveChangesAsync(ct);

            if (action.Action is "remove" or "ban" or "mute")
                await _bus.PublishAsync("content.removed", new { targetType = report.TargetType, targetId = report.TargetId, reason = action.Action, at = action.CreatedAt }, ct);

            return Ok(new ModerationActionRead(action.Id, action.ReportId, action.ModeratorId, action.TargetType, action.TargetId, action.Action, action.Reason, action.CreatedAt));
        }

        // --- Auto-flag hook (Phase 8 AI integration) ---
        [HttpPost("/api/internal/moderation/auto-flag")]
        public async Task<IActionResult> AutoFlag([FromBody] AutoFlagRequest dto, CancellationToken ct)
        {
            const int FlagThreshold = 3;
            const int RemoveThreshold = 5;

            int maxScore = Math.Max(Math.Max(dto.Scores.Hate, dto.Scores.Sexual), Math.Max(dto.Scores.Violence, dto.Scores.SelfHarm));
            if (maxScore < FlagThreshold) return Ok(new { flagged = false, action = (string?)null });

            Report report = new Report
            {
                ReporterUserId = Guid.Empty, // system
                TargetType = Normalize(dto.ContentType),
                TargetId = dto.ContentId,
                Reason = "ai-auto-flag",
                DetailsJson = System.Text.Json.JsonSerializer.Serialize(dto.Scores),
                Status = maxScore >= RemoveThreshold ? "actioned" : "open"
            };
            _db.Reports.Add(report);

            ModerationAction? autoAction = null;
            if (maxScore >= RemoveThreshold)
            {
                autoAction = new ModerationAction
                {
                    ReportId = report.Id,
                    ModeratorId = Guid.Empty,
                    TargetType = report.TargetType,
                    TargetId = dto.ContentId,
                    Action = "remove",
                    Reason = $"AI auto-remove: max score {maxScore}"
                };
                _db.ModerationActions.Add(autoAction);
                await _bus.PublishAsync("content.removed", new { targetType = report.TargetType, targetId = dto.ContentId, reason = "ai-auto-remove", at = autoAction.CreatedAt }, ct);
            }

            await _db.SaveChangesAsync(ct);
            return Ok(new { flagged = true, action = autoAction?.Action, reportId = report.Id });
        }

        private static string Normalize(string s) => s.Trim().ToLowerInvariant();
        private static DecisionRead ToRead(Decision d) => new(d.Id, d.TargetType, d.TargetId, d.Action, d.ActorUserId, d.CreatedAt, d.Ttl.HasValue ? (int?)d.Ttl.Value.TotalMinutes : null, d.Notes);
    }
}