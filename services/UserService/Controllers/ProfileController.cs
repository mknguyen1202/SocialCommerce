using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UserService.Data;
using UserService.Dtos;
using UserService.Services;


namespace UserService.Controllers
{
    [ApiController]
    [Route("api/user/profile")]
    public class ProfileController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IMediaServiceClient _media;

        public ProfileController(AppDbContext db, IMediaServiceClient media)
        {
            _db = db;
            _media = media;
        }


        private string? GetIdentityId()
        {
            // Prefer "oid" (Entra) or "sub" (OIDC standard)
            return User.FindFirst("oid")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        }


        [HttpGet]
        [Authorize(Policy = "user.read")]
        public async Task<ActionResult<ProfileReadDto>> GetMe()
        {
            string? identityId = GetIdentityId();
            if (identityId is null) return Unauthorized();


            UserProfile? profile = await _db.UserProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.IdentityId == identityId);
            if (profile is null)
            {
                // Auto-provision profile on first login
                profile = new UserProfile
                {
                    IdentityId = identityId,
                    Email = User.FindFirst(ClaimTypes.Email)?.Value,
                    DisplayName = User.Identity?.Name
                };
                _db.UserProfiles.Add(profile);
                await _db.SaveChangesAsync();
            }


            return Ok(new ProfileReadDto(
                profile.Id,
                profile.IdentityId,
                profile.Username,
                profile.DisplayName,
                profile.FirstName,
                profile.LastName,
                profile.DateOfBirth,
                profile.Email,
                profile.Phone,
                profile.AvatarUrl,
                profile.Bio,
                profile.BannerUrl,
                profile.IsVendor,
                profile.LastSeen
                )
             );
        }


        [HttpPut]
        [Authorize(Policy = "user.write")]
        public async Task<IActionResult> Update(ProfileUpdateDto dto)
        {
            Console.WriteLine(">>>>>>>>>>>>>>>>>>>>>>>> Update", dto);
            string? identityId = GetIdentityId();
            if (identityId is null) return Unauthorized();


            UserProfile? profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.IdentityId == identityId);
            if (profile is null) return NotFound();


            profile.DisplayName = dto.DisplayName ?? profile.DisplayName;
            profile.FirstName = dto.FirstName ?? profile.FirstName;
            profile.LastName = dto.LastName ?? profile.LastName;
            profile.DateOfBirth = dto.DateOfBirth ?? profile.DateOfBirth;
            profile.Phone = dto.Phone ?? profile.Phone;
            profile.AvatarUrl = dto.AvatarUrl ?? profile.AvatarUrl;
            if (dto.Username is not null && dto.Username != profile.Username)
            {
                bool taken = await _db.UserProfiles.AsNoTracking()
                    .AnyAsync(p => p.Username == dto.Username && p.Id != profile.Id);
                if (taken) return Conflict(new { message = "Username is already taken." });
                profile.Username = dto.Username;
            }
            profile.Bio = dto.Bio ?? profile.Bio;
            profile.BannerUrl = dto.BannerUrl ?? profile.BannerUrl;
            profile.UpdatedAt = DateTimeOffset.UtcNow;


            await _db.SaveChangesAsync();
            return NoContent();
        }





        [HttpPost]
        [Authorize(Policy = "user.write")]
        public async Task<ActionResult<ProfileReadDto>> Create([FromBody] ProfileCreateDto dto)
        {
            string? identityId = GetIdentityId();
            if (identityId is null) return Unauthorized();

            // Don’t allow duplicate profiles for the same identity
            bool exists = await _db.UserProfiles.AsNoTracking()
                .AnyAsync(p => p.IdentityId == identityId);
            if (exists) return Conflict(new { message = "Profile already exists for this user." });

            // Prefer claims when dto fields are omitted
            string? claimEmail = User.FindFirst(ClaimTypes.Email)?.Value;
            string? claimDisplayName = User.Identity?.Name;

            UserProfile profile = new UserProfile
            {
                IdentityId = identityId,                         // always from token
                Username = dto.Username,
                DisplayName = dto.DisplayName ?? claimDisplayName,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                DateOfBirth = dto.DateOfBirth,
                Email = dto.Email ?? claimEmail,
                Phone = dto.Phone,
                AvatarUrl = dto.AvatarUrl,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _db.UserProfiles.Add(profile);
            await _db.SaveChangesAsync();

            ProfileReadDto read = new ProfileReadDto(
                profile.Id,
                profile.IdentityId,
                profile.Username,
                profile.DisplayName,
                profile.FirstName,
                profile.LastName,
                profile.DateOfBirth,
                profile.Email,
                profile.Phone,
                profile.AvatarUrl,
                profile.Bio,
                profile.BannerUrl,
                profile.IsVendor,
                profile.LastSeen
            );

            // Points to GET /api/user/profile (current user)
            return CreatedAtAction(nameof(GetMe), routeValues: null, value: read);
        }

        [HttpGet("{userId:guid}")]
        public async Task<ActionResult<PublicProfileReadDto>> GetPublic(Guid userId)
        {
            UserProfile? profile = await _db.UserProfiles.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == userId);
            if (profile is null) return NotFound();

            return Ok(new PublicProfileReadDto(
                profile.Id,
                profile.Username,
                profile.DisplayName,
                profile.AvatarUrl,
                profile.Bio,
                profile.BannerUrl,
                profile.IsVendor,
                profile.LastSeen
            ));
        }

        [HttpPost("me/avatar")]
        [Authorize(Policy = "user.write")]
        public async Task<ActionResult<object>> UploadAvatar(IFormFile file)
        {
            string? identityId = GetIdentityId();
            if (identityId is null) return Unauthorized();

            UserProfile? profile = await _db.UserProfiles.FirstOrDefaultAsync(p => p.IdentityId == identityId);
            if (profile is null) return NotFound();

            MediaUploadResult result = await _media.UploadAsync(file, "avatar");

            profile.AvatarUrl = result.Url;
            profile.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { mediaId = result.MediaId, url = result.Url });
        }

    }
}