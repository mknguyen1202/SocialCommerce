import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "./types";

// Endpoint paths expected by the backend:
const ME_PATH = "/auth/me";
const CSRF_PATH = "/auth/csrf";
const LOGIN_URL = (provider: string) => `/auth/login/${provider}`;
const CSRF_COOKIE = "XSRF-TOKEN";
const CSRF_HEADER = "X-CSRF";

// If your API is same-origin, leave VITE_API_URL empty ("").
// If cross-origin, set VITE_API_URL to e.g. "http://localhost:5001"
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

function apiUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function getCookie(name: string): string | null {
    const m = document.cookie.match(
        new RegExp(`(?:^|; )${name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&")}=([^;]*)`)
    );
    return m ? decodeURIComponent(m[1]) : null;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 8000) {
    const ctl = new AbortController();
    const id = setTimeout(() => ctl.abort(), ms);
    try {
        return await fetch(input, { ...init, signal: ctl.signal });
    } finally {
        clearTimeout(id);
    }
}

export function useAuth() {
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState(true);

    const me = useCallback(async () => {
        try {
            const res = await fetchWithTimeout(apiUrl(ME_PATH), { credentials: "include" }, 8000);
            if (res.ok) {
                const data = (await res.json()) as User;
                setUser(data);
                return data;
            } else {
                setUser(null);
                return null;
            }
        } catch (err) {
            console.error("[auth] /auth/me failed:", err);
            setUser(null);
            return null;
        }
    }, []);

    useEffect(() => {
        fetch(apiUrl(CSRF_PATH), { credentials: "include" }).catch(() => { });
    }, []);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            await me();
            if (alive) setLoading(false);
        })();
        return () => {
            alive = false;
        };
    }, [me]);

    const login = useCallback(
        async (provider: "Google" | "Microsoft" | "Facebook" | "Apple") => {
            const prov = provider.toLowerCase();

            const w = 520, h = 640;
            const y = window.top!.outerHeight / 2 + window.top!.screenY - h / 2;
            const x = window.top!.outerWidth / 2 + window.top!.screenX - w / 2;

            const popup = window.open(
                apiUrl(LOGIN_URL(prov)),
                "Sign in",
                `popup=yes,width=${w},height=${h},top=${y},left=${x}`
            );

            await new Promise<void>((resolve) => {
                function onMsg(e: MessageEvent) {
                    if (e?.data?.type === "auth:success") {
                        window.removeEventListener("message", onMsg);
                        resolve();
                    }
                }
                window.addEventListener("message", onMsg);

                const poll = setInterval(() => {
                    if (!popup || popup.closed) {
                        clearInterval(poll);
                        window.removeEventListener("message", onMsg);
                        resolve();
                    }
                }, 400);

                setTimeout(() => {
                    clearInterval(poll);
                    window.removeEventListener("message", onMsg);
                    resolve();
                }, 20000);
            });

            await me();
        },
        [me]
    );

    const logout = useCallback(async () => {
        const csrf = getCookie(CSRF_COOKIE) ?? ""; // CSRF cookie name from backend
        try {
            await fetch(apiUrl("/auth/logout"), {
                method: "POST",
                credentials: "include",
                headers: { [CSRF_HEADER]: csrf }   // <-- was { CSRF_HEADER: csrf }
            });
        } finally {
            setUser(null);
        }
    }, []);

    const apiFetch = useCallback(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const method = (init?.method ?? "GET").toUpperCase();
            const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
            const csrf = needsCsrf ? getCookie(CSRF_COOKIE) ?? "" : "";

            // Prefix relative paths with API_BASE
            const url =
                typeof input === "string" || input instanceof URL
                    ? apiUrl(String(input))
                    : input;

            const res = await fetch(url, {
                ...init,
                credentials: "include",
                headers: {
                    ...(init?.headers ?? {}),
                    ...(needsCsrf ? { [CSRF_HEADER]: csrf } : {})  // <-- was { CSRF_HEADER: csrf }
                }
            });

            if (res.status === 401) {
                await me();
            }
            return res;
        },
        [me]
    );

    const hasRole = useCallback(
        (role: string) =>
            !!user?.roles?.some((r) => r.toLowerCase() === role.toLowerCase()),
        [user]
    );

    const hasAnyPermission = useCallback(
        (perms: string[]) => {
            const set = new Set(user?.permissions?.map((p) => p.toLowerCase()) ?? []);
            return perms.some((p) => set.has(p.toLowerCase()));
        },
        [user]
    );

    const loginWithEmail = useCallback(
        async (email: string, _password: string) => {
            // Mock implementation — resolves immediately with a local user, no backend call.
            const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            setUser({ id: 'mock-email', name, email, roles: [], permissions: [] });
        },
        []
    );

    return useMemo(
        () => ({ user, loading, login, loginWithEmail, logout, me, apiFetch, hasRole, hasAnyPermission }),
        [user, loading, login, loginWithEmail, logout, me, apiFetch, hasRole, hasAnyPermission]
    );
}
