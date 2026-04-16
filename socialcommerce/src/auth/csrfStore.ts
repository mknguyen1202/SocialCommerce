/**
 * In-memory CSRF token store.
 * The token is fetched from /auth/csrf on mount and after every login.
 * client.ts reads it here instead of document.cookie (which can't access
 * cookies set by a different domain in a cross-origin BFF setup).
 */
let _token: string | null = null;

export function getCsrfToken(): string | null {
  return _token;
}

export function setCsrfToken(token: string | null): void {
  _token = token;
}
