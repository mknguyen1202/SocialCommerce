namespace UserService.Auth.Abstractions
{
    public interface IPermissionResolver
    {
        Task<(IEnumerable<string> Roles, IEnumerable<string> Permissions)> GetForUserAsync(Guid userId);
    }
}
