import { http, HttpResponse } from 'msw';
import { AUTH_USER } from '../data/users';

export const authHandlers = [
    // Seed CSRF cookie — the client reads this from `document.cookie`
    http.get('*/auth/csrf', () => {
        return new HttpResponse(null, {
            status: 204,
            headers: {
                'Set-Cookie': 'XSRF-TOKEN=mock-csrf-token; Path=/; SameSite=Lax',
            },
        });
    }),

    // Return the currently logged-in mock user
    http.get('*/auth/me', () => {
        return HttpResponse.json(AUTH_USER);
    }),

    // OAuth redirect stubs — redirect straight back to the app
    http.get('*/auth/login/:provider', () => {
        return new HttpResponse(null, { status: 302, headers: { Location: '/' } });
    }),

    // Logout — clear session cookie (mock)
    http.post('*/auth/logout', () => {
        return new HttpResponse(null, { status: 204 });
    }),
];
