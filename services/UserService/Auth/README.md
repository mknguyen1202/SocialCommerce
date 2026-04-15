UserService/
└─ Auth/
   ├─ Abstractions/
   │  ├─ IExternalAuthProvider.cs            // Port for Google/Facebook/Apple adapters
   │  ├─ ExternalUserInfo.cs                 // Normalized claims from providers
   │  ├─ ITokenService.cs                    // First-party JWT (if you ever mint)
   │  ├─ IAppleClientSecretSigner.cs         // Apple client_secret (JWT) signer
   │  └─ IPermissionResolver.cs              // Map userId -> roles/permissions
   │
   ├─ Bff/
   │  ├─ Endpoints.cs                        // /auth/login/{provider}, /auth/callback/{provider}/signin, /auth/me, /auth/logout
   │  ├─ CookieSchemes.cs                    // Primary cookie scheme names & options
   │  ├─ Csrf/
   │  │  ├─ CsrfMiddleware.cs                // Double-submit cookie (App.CSRF) validator
   │  │  └─ CsrfCookieWriter.cs              // Issues readable CSRF cookie
   │  └─ AuthResultViews/
   │     └─ ClosePopup.html                  // Tiny page to postMessage & close popup
   │
   ├─ External/                               // Adapters (one folder per IdP)
   │  ├─ Core/
   │  │  ├─ ExternalAuthRegistrar.cs         // Registers providers from config
   │  │  └─ ExternalLoginService.cs          // Orchestrates: challenge -> callback -> normalize
   │  ├─ Google/
   │  │  ├─ GoogleOptions.cs
   │  │  └─ GoogleAuthProvider.cs            // Implements IExternalAuthProvider
   │  ├─ Facebook/
   │  │  └─ FacebookAuthProvider.cs
   │  └─ Apple/
   │     ├─ AppleOptions.cs
   │     ├─ AppleClientSecretSigner.cs       // Implements IAppleClientSecretSigner
   │     └─ AppleAuthProvider.cs
   │
   ├─ Authorization/
   │  ├─ PolicyNames.cs                      // "user.read", "user.write", etc.
   │  ├─ AuthorizationExtensions.cs          // AddAuthorization policies
   │  ├─ Requirements/
   │  │  └─ PermissionRequirement.cs
   │  └─ Handlers/
   │     └─ PermissionHandler.cs             // Reads claims/DB to satisfy requirement
   │
   ├─ IdentityMapping/
   │  ├─ ExternalLoginLink.cs                // (Provider, ProviderKey, UserId) model
   │  ├─ IUserLinker.cs                      // Maps provider identity -> local user
   │  └─ UserLinker.cs
   │
   ├─ Jwt/                                   // Optional: service-to-service or mobile
   │  ├─ TokenOptions.cs
   │  ├─ JwtTokenService.cs                  // ITokenService (mint/validate)
   │  └─ JwtBearerExtensions.cs              // Validation for inbound tokens (S2S)
   │
   ├─ Options/
   │  ├─ AuthOptions.cs                      // App.Auth cookie name, lifetimes, SameSite
   │  └─ ProviderOptionsBinder.cs
   │
   ├─ Startup/
   │  ├─ AuthServiceCollectionExtensions.cs  // One-stop AddBffAuth(this IServiceCollection)
   │  └─ AuthEndpointRouteBuilderExtensions.cs // MapAuthEndpoints(this IEndpointRouteBuilder)
   │
   └─ Tests/ (…)




   Wiring snapshot (for context)

In Program.cs (or your auth bootstrapper):
```
// Bind options (Auth, Google, Apple, Jwt)
builder.Services.AddAuthOptionsFromConfig(builder.Configuration);

// BFF cookie schemes (uses BffCookieOptions that the binder registered)
builder.Services.AddAppCookieAuthentication();

// Authorization policies
builder.Services.AddAuthorizationWithPolicies();

// JWT bearer (optional, for S2S)
builder.Services.AddApiJwtBearer(builder.Configuration);

// Permission resolver (optional, used by PermissionHandler)
builder.Services.AddSingleton<UserService.Auth.Abstractions.IPermissionResolver, YourPermissionResolver>();

// Identity mapping
builder.Services.AddSingleton<UserService.Auth.IdentityMapping.IUserLinker, UserService.Auth.IdentityMapping.UserLinker>();
// ...and your IExternalLoginLinkStore backed by EF Core
```

This completes the BFF + policies + identity-mapping + optional JWT setup in neat, focused units.