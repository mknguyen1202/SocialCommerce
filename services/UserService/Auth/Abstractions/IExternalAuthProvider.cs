using Microsoft.AspNetCore.Authentication;

namespace UserService.Auth.Abstractions
{
    public interface IExternalAuthProvider
    {
        string Name { get; } // "Google", "Facebook", "Apple"
        AuthenticationProperties BuildChallengeProperties(HttpContext ctx, string callbackPath);
        Task<ExternalUserInfo?> HandleCallbackAsync(HttpContext ctx); // read temp cookie / exchange code
    }
}
