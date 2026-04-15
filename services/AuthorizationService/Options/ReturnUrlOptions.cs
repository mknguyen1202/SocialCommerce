using System.Text.RegularExpressions;

namespace AuthorizationService.Options;

/// <summary>Controls normalization and validation of post-login return URLs to prevent open redirects.</summary>
public sealed class ReturnUrlOptions
{
    /// <summary>Default path used when an incoming returnUrl is missing or invalid.</summary>
    public string DefaultPath { get; set; } = "/";

    /// <summary>Absolute origins (scheme://host[:port]) allowed for external return URLs (rare).</summary>
    public string[] AllowedOrigins { get; set; } = Array.Empty<string>();

    /// <summary>Application-local path allowlist prefixes. If empty, any absolute-external URL is rejected and local absolute paths are allowed.</summary>
    public string[] AllowedPathPrefixes { get; set; } = new[] { "/" };

    /// <summary>
    /// If true, absolute external URLs whose origin is listed in AllowedOrigins are permitted.
    /// If false, only relative, app-local paths are accepted.
    /// </summary>
    public bool AllowExternal { get; set; } = false;

    /// <summary>Optional hard base path to prepend when incoming returnUrl is a bare relative (e.g., "dashboard").</summary>
    public string? BasePath { get; set; }
}

public interface IReturnUrlValidator
{
    /// <summary>Returns a safe normalized return URL or the configured default if invalid.</summary>
    string Normalize(string? candidate);
}

public sealed class DefaultReturnUrlValidator : IReturnUrlValidator
{
    private readonly ReturnUrlOptions _opt;
    private readonly HashSet<string> _origins;

    public DefaultReturnUrlValidator(Microsoft.Extensions.Options.IOptions<ReturnUrlOptions> opt)
    {
        _opt = opt.Value;
        _origins = new HashSet<string>(
            (_opt.AllowedOrigins ?? Array.Empty<string>())
            .Select(NormalizeOrigin)
            .Where(s => s is not null)!,
            StringComparer.OrdinalIgnoreCase);
    }

    public string Normalize(string? candidate)
    {
        if (string.IsNullOrWhiteSpace(candidate))
            return _opt.DefaultPath;

        // If something like "dashboard" is provided, apply BasePath ("/" by default)
        if (!candidate.StartsWith("/", StringComparison.Ordinal) &&
            !candidate.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !candidate.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            var basePath = string.IsNullOrEmpty(_opt.BasePath) ? "/" : _opt.BasePath!;
            candidate = CombinePaths(basePath, candidate);
        }

        // Absolute?
        if (Uri.TryCreate(candidate, UriKind.Absolute, out var abs))
        {
            if (!_opt.AllowExternal) return _opt.DefaultPath;

            var origin = $"{abs.Scheme}://{abs.Host}{(abs.IsDefaultPort ? "" : $":{abs.Port}")}";
            return _origins.Contains(origin) ? abs.PathAndQuery + abs.Fragment : _opt.DefaultPath;
        }

        // Relative path (must start with '/')
        if (!candidate.StartsWith("/", StringComparison.Ordinal))
            return _opt.DefaultPath;

        // Basic sanity: reject '//' or backslashes to avoid protocol-relative or path tricks
        if (candidate.StartsWith("//", StringComparison.Ordinal) || candidate.Contains('\\'))
            return _opt.DefaultPath;

        // Prefix allowlist
        if ((_opt.AllowedPathPrefixes?.Length ?? 0) > 0)
        {
            var ok = _opt.AllowedPathPrefixes!.Any(p => candidate.StartsWith(p, StringComparison.Ordinal));
            if (!ok) return _opt.DefaultPath;
        }

        return candidate;
    }

    private static string? NormalizeOrigin(string origin)
    {
        if (string.IsNullOrWhiteSpace(origin)) return null;
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var u)) return null;
        return $"{u.Scheme}://{u.Host}{(u.IsDefaultPort ? "" : $":{u.Port}")}";
    }

    private static string CombinePaths(string a, string b)
    {
        if (string.IsNullOrEmpty(a)) return "/" + b.TrimStart('/');
        var s = a.EndsWith("/") ? a : a + "/";
        return s + b.TrimStart('/');
    }
}
