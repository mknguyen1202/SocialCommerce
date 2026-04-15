AuthorizationService (BFF)

This project implements a Backend-for-Frontend (BFF) authorization service for a React TypeScript frontend using PKCE + OAuth2/OpenID Connect.
It supports multiple providers (Google, Microsoft, Facebook, Apple) and issues secure HTTP-only session cookies instead of exposing tokens to the browser.

🔑 Features

PKCE Code Flow: Secure OAuth2/OIDC login with Proof Key for Code Exchange.

Multi-Provider Support: Google, Microsoft, Facebook, Apple.

BFF Session Cookie: The browser only stores an HttpOnly cookie (no tokens).

CSRF Protection: Double-submit cookie or X-CSRF header validation.

Downstream Access: Provider tokens stored server-side and refreshed automatically.

Internal JWT (optional): Issue short-lived JWTs for internal microservices.

🗂 Project Structure
AuthorizationService/ 
├─ src/
│  ├─ AuthorizationService.Api/
│  │  ├─ Controllers/
│  │  │  ├─ Auth/
│  │  │  │  ├─ StartController.cs          # /auth/{provider}/start
│  │  │  │  ├─ CallbackController.cs       # /auth/{provider}/callback
│  │  │  │  ├─ LogoutController.cs         # /auth/logout
│  │  │  ├─ MeController.cs                # /me (current user)
│  │  │  ├─ CsrfController.cs              # /auth/csrf -> CSRF token
│  │  ├─ Bff/
│  │  │  ├─ ProxyMiddleware.cs             # optional: /api/* proxy
│  │  │  ├─ ClaimsEnricher.cs              # map provider claims -> app claims
│  │  ├─ Oidc/
│  │  │  ├─ Providers/
│  │  │  │  ├─ GoogleProvider.cs
│  │  │  │  ├─ MicrosoftProvider.cs
│  │  │  │  ├─ FacebookProvider.cs
│  │  │  │  ├─ AppleProvider.cs
│  │  │  ├─ PkceService.cs                 # code_verifier/challenge utils
│  │  │  ├─ TokenExchangeService.cs        # redeem code for tokens
│  │  │  ├─ IdTokenValidator.cs            # validate id_token
│  │  ├─ Sessions/
│  │  │  ├─ SessionStore.cs                # DB/Redis session handling
│  │  │  ├─ SessionCookieOptions.cs
│  │  ├─ Security/
│  │  │  ├─ CsrfService.cs
│  │  │  ├─ StateStore.cs
│  │  │  ├─ NonceStore.cs
│  │  ├─ Options/
│  │  │  ├─ ProviderOptions.cs             # base config
│  │  │  ├─ GoogleOptions.cs
│  │  │  ├─ MicrosoftOptions.cs
│  │  │  ├─ FacebookOptions.cs
│  │  │  ├─ AppleOptions.cs
│  │  ├─ Infrastructure/
│  │  │  ├─ HttpClients/
│  │  │  │  ├─ ProviderHttpClient.cs
│  │  │  ├─ Persistence/
│  │  │  │  ├─ AppDbContext.cs
│  │  │  │  ├─ Entities/ (User, ExternalLogin, Session, StoredToken)
│  │  │  │  ├─ Migrations/
│  │  ├─ Program.cs
│  │  ├─ appsettings.json
│  ├─ AuthorizationService.Tests/
│  └─ AuthorizationService.sln
├─ docker/
│  ├─ Dockerfile
│  └─ docker-compose.yml
└─ README.md

🔄 Authentication Flow

SPA calls /auth/{provider}/start → redirect to provider with state, nonce, and PKCE code_challenge.

Provider authenticates the user → redirects back to /auth/{provider}/callback with code.

BFF exchanges code + code_verifier for tokens, validates id_token.

BFF creates a secure session and issues bff.sid cookie.

SPA calls /me → retrieves user profile.

Subsequent API calls include session cookie + X-CSRF → BFF attaches tokens/internal JWT when calling microservices.

Logout via /auth/logout clears session + cookies.

🍪 Cookies

bff.sid — session cookie (HttpOnly, Secure, SameSite=Lax/Strict).

bff.csrf — CSRF token cookie (non-HttpOnly) or retrieved via /auth/csrf.

⚙️ Configuration (appsettings.json)
{
  "Authentication": {
    "Cookie": {
      "Name": "bff.sid",
      "SameSite": "Lax",
      "Secure": true
    },
    "Providers": {
      "Google": {
        "ClientId": "xxx.apps.googleusercontent.com",
        "ClientSecret": "env:GOOGLE_SECRET",
        "Scopes": "openid profile email",
        "Authority": "https://accounts.google.com",
        "RedirectUri": "https://localhost:5001/auth/google/callback"
      },
      "Microsoft": {
        "ClientId": "...",
        "ClientSecret": "env:MS_SECRET",
        "Scopes": "openid profile email",
        "Authority": "https://login.microsoftonline.com/common/v2.0",
        "RedirectUri": "https://localhost:5001/auth/microsoft/callback"
      },
      "Facebook": {
        "ClientId": "...",
        "ClientSecret": "env:FB_SECRET",
        "Scopes": "public_profile email",
        "AuthUrl": "https://www.facebook.com/v19.0/dialog/oauth",
        "TokenUrl": "https://graph.facebook.com/v19.0/oauth/access_token",
        "UserInfoUrl": "https://graph.facebook.com/me?fields=id,name,email",
        "RedirectUri": "https://localhost:5001/auth/facebook/callback"
      },
      "Apple": {
        "ClientId": "com.example.app.web",
        "TeamId": "ABC123XYZ",
        "KeyId": "XYZ987ABC",
        "PrivateKeyPath": "secrets/AuthKey_XYZ987ABC.p8",
        "Scopes": "openid email name",
        "Authority": "https://appleid.apple.com",
        "RedirectUri": "https://localhost:5001/auth/apple/callback"
      }
    }
  },
  "ConnectionStrings": {
    "Default": "Host=postgres;Port=5432;Database=authdb;Username=auth;Password=***"
  }
}


Secrets (e.g., ClientSecret, Apple private key) should be provided via environment variables or Azure Key Vault in production.

🚀 Running Locally

Generate dev SSL certs:

dotnet dev-certs https --trust


Update appsettings.Development.json with provider credentials.

Run via Docker Compose:

docker-compose up --build


Access API at: https://localhost:5001

✅ Security Notes

Always use HTTPS.

Store refresh/access tokens encrypted.

Validate state, nonce, and id_token claims.

Use short-lived internal JWTs for microservice-to-microservice calls.


AuthorizationService/
├─ Controllers/           # Start, Callback, Logout, Me, Csrf
├─ Bff/                   # ProxyMiddleware, ClaimsEnricher, AppUser, SessionRecord
├─ Oidc/                  # Providers, PKCE, Token exchange, ID token validation, logout hooks
├─ Sessions/              # CookieIssuer, ISessionStore (in-mem & EF), token protector
├─ Security/              # CSRF, state & nonce stores, CryptoRandom
├─ Options/               # Provider options, ReturnUrl validator, URL encoder
├─ Infrastructure/
│  ├─ HttpClients/        # Typed provider HTTP client
│  └─ Persistence/        # AppDbContext, Entities (User, ExternalLogin, Session, StoredToken)
├─ Program.cs

sequenceDiagram
    autonumber
    participant SPA as SPA (React/TS)
    participant BFF as AuthorizationService (BFF)
    participant OP as OAuth Provider
    participant SVC as Internal Services

    SPA->>BFF: GET /auth/{provider}/start?returnUrl=/app
    BFF->>BFF: create state, nonce, code_verifier (save)
    BFF-->>SPA: 302 to provider authorize URL
    SPA->>OP: GET /authorize (login/consent)
    OP-->>SPA: 302 back to /auth/{provider}/callback?code&state
    SPA->>BFF: GET /auth/{provider}/callback?code&state
    BFF->>BFF: validate state/nonce
    BFF->>OP: POST /token (code + code_verifier)
    OP-->>BFF: access_token (+ refresh, id_token)
    BFF->>BFF: validate id_token, map claims
    BFF->>BFF: create server session; store tokens
    BFF-->>SPA: Set-Cookie (HttpOnly session); 302 /app

    SPA->>BFF: GET /me (cookie only)
    BFF-->>SPA: { id, email, roles, ... }

    SPA->>BFF: POST /api/social/post (X-CSRF-Token)
    BFF->>SVC: Forward with Internal JWT
    SVC-->>BFF: 200 OK
    BFF-->>SPA: 200 OK


Endpoints (BFF)
```
GET /auth/{provider}/start?returnUrl=/app – start OAuth (PKCE); providers: google|microsoft|facebook|apple

GET /auth/{provider}/callback?code&state – finishes login, sets session cookie, redirects to returnUrl

GET /auth/csrf – issues CSRF token (+ sets XSRF-TOKEN cookie for double-submit)

GET /me – current user info from server session

POST /auth/logout – CSRF-protected logout (clears session; optional provider revocation)

/* – controllers for auth + Bff/ProxyMiddleware for /api/ reverse proxy

GET /healthz – liveness/health
```
Proxy
Routes under /api/* are forwarded to internal services based on BffProxy.Routes in config. For protected routes, the BFF verifies the session, enforces CSRF on unsafe methods, strips incoming Authorization, and attaches a short-lived internal JWT for downstream auth.