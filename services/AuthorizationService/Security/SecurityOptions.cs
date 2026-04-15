namespace AuthorizationService.Security;

/// <summary>Top-level security knobs (bind from "Security" section in config).</summary>
public sealed class SecurityOptions
{
    /// <summary>Default lifetime for OAuth 'state' entries (minutes).</summary>
    public int StateTtlMinutes { get; set; } = 10;

    /// <summary>Default lifetime for OIDC 'nonce' entries (minutes).</summary>
    public int NonceTtlMinutes { get; set; } = 10;

    /// <summary>CSRF configuration.</summary>
    public CsrfOptions Csrf { get; set; } = new();
}

public sealed class CsrfOptions
{
    /// <summary>DoubleSubmit or HeaderOnly.</summary>
    public CsrfMode Mode { get; set; } = CsrfMode.DoubleSubmit;

    /// <summary>Readable cookie name emitted for double-submit tokens.</summary>
    public string CookieName { get; set; } = "XSRF-TOKEN";

    /// <summary>Header name clients must send with state-changing requests.</summary>
    public string HeaderName { get; set; } = "X-CSRF-Token";

    /// <summary>CSRF token TTL (minutes).</summary>
    public int TokenTtlMinutes { get; set; } = 30;

    /// <summary>Set cookie SameSite attribute (Lax recommended).</summary>
    public string SameSite { get; set; } = "Lax"; // "Lax" | "None" | "Strict"

    /// <summary>If true, the CSRF cookie is marked Secure (HTTPS only).</summary>
    public bool Secure { get; set; } = true;

    /// <summary>Cookie Path.</summary>
    public string Path { get; set; } = "/";
}

public enum CsrfMode { DoubleSubmit, HeaderOnly }
