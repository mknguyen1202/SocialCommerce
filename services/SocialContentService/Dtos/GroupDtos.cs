using SocialContentService.Data;

namespace SocialContentService.Dtos
{
    public record CreateGroupDto(
        string Name,
        string Slug,
        string? Description,
        string Visibility = "public");

    public record UpdateGroupDto(
        string? Name,
        string? Description,
        string? AvatarUrl,
        string? BannerUrl);

    public record GroupReadDto(
        Guid Id,
        string Name,
        string Slug,
        string? Description,
        string? AvatarUrl,
        string? BannerUrl,
        string Visibility,
        int MemberCount,
        Guid CreatedBy,
        DateTimeOffset CreatedAt);

    public record GroupMemberReadDto(Guid GroupId, Guid UserId, string Role, DateTimeOffset JoinedAt);
    public record UpdateMemberRoleDto(string Role);
    public record GroupRuleDto(Guid? Id, Guid GroupId, string Title, string? Description, int DisplayOrder);
    public record ReplaceRulesDto(IEnumerable<GroupRuleDto> Rules);
    public record BanUserDto(string? Reason, DateTimeOffset? ExpiresAt);
    public record GroupBanReadDto(Guid GroupId, Guid UserId, Guid BannedBy, string? Reason, DateTimeOffset? ExpiresAt, DateTimeOffset CreatedAt);

    public static class GroupMapping
    {
        public static GroupReadDto ToRead(this Group g) => new(
            g.Id, g.Name, g.Slug, g.Description, g.AvatarUrl, g.BannerUrl,
            g.Visibility, g.MemberCount, g.CreatedBy, g.CreatedAt);
    }
}
