/**
 * Shared API client with CSRF support and request/response interceptors.
 * CSRF token is stored in csrfStore (set by useAuth on mount and after login)
 * because document.cookie cannot read cookies from the backend domain
 * in a cross-origin BFF setup.
 */
import { getCsrfToken } from '../../auth/csrfStore';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const CSRF_HEADER = 'X-CSRF';

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

/** Thrown when the network request itself fails (no HTTP response received). */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Network request failed — check your connection.');
    this.name = 'NetworkError';
    if (cause instanceof Error) this.cause = cause;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const csrfToken = getCsrfToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (csrfToken) {
    headers[CSRF_HEADER] = csrfToken;
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      credentials: 'include',
      ...init,
      headers,
    });
  } catch (err) {
    throw new NetworkError(err);
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ?? message;
    } catch {
      // ignore JSON parse errors
    }
    const err: ApiError = { status: res.status, message };
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path);

export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) =>
  apiFetch<T>(path, { method: 'DELETE' });
