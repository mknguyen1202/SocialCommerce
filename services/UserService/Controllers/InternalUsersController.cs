using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Dtos;

namespace UserService.Controllers;

[ApiController]
[Route("api/user/internal/users")]
[Authorize(AuthenticationSchemes = "ApiJwt")]
public class InternalUsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public InternalUsersController(AppDbContext db) => _db = db;

    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<InternalUserDto>> GetById(Guid userId)
    {
        UserProfile? profile = await _db.UserProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == userId);
        if (profile is null) return NotFound();

        return Ok(new InternalUserDto(
            profile.Id,
            profile.IdentityId,
            profile.Username,
            profile.DisplayName,
            profile.Email,
            profile.AvatarUrl,
            profile.IsVendor
        ));
    }
}
