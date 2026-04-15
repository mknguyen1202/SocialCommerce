namespace UserService.Dtos
{
    public record ProfileReadDto(
        Guid Id,
        string IdentityId,
        string? Username,
        string? DisplayName,
        string? FirstName,
        string? LastName,
        DateOnly? DateOfBirth,
        string? Email,
        string? Phone,
        string? AvatarUrl,
        string? Bio,
        string? BannerUrl,
        bool IsVendor,
        DateTimeOffset? LastSeen
    );

    public record ProfileUpdateDto(
        string? Username,
        string? DisplayName,
        string? FirstName,
        string? LastName,
        DateOnly? DateOfBirth,
        string? Phone,
        string? AvatarUrl,
        string? Bio,
        string? BannerUrl
    );

    public record ProfileCreateDto(
        string? Username,
        string? DisplayName,
        string? FirstName,
        string? LastName,
        DateOnly? DateOfBirth,
        string? Email,
        string? Phone,
        string? AvatarUrl
    );

    public record PublicProfileReadDto(
        Guid Id,
        string? Username,
        string? DisplayName,
        string? AvatarUrl,
        string? Bio,
        string? BannerUrl,
        bool IsVendor,
        DateTimeOffset? LastSeen
    );

    public record InternalUserDto(
        Guid Id,
        string IdentityId,
        string? Username,
        string? DisplayName,
        string? Email,
        string? AvatarUrl,
        bool IsVendor
    );
}