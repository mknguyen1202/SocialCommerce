import { http, HttpResponse } from 'msw';
import { AUTH_USER } from '../data/users';

// In-memory mutable state for the mock profile
let mockProfile = { ...AUTH_USER };

export const profileHandlers = [
    // GET /api/profile — return current profile
    http.get('*/api/profile', () => {
        return HttpResponse.json(mockProfile);
    }),

    // PATCH /api/profile — update name and/or bio
    http.patch('*/api/profile', async ({ request }) => {
        const updates = await request.json() as Partial<{ name: string; bio: string }>;
        if (updates.name !== undefined) mockProfile = { ...mockProfile, name: updates.name };
        if (updates.bio !== undefined) mockProfile = { ...mockProfile, bio: updates.bio };
        return HttpResponse.json(mockProfile);
    }),

    // POST /api/profile/avatar — accept any body, echo back a placeholder data URL
    http.post('*/api/profile/avatar', async ({ request }) => {
        const blob = await request.blob();
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
        mockProfile = { ...mockProfile, avatarUrl: dataUrl };
        return HttpResponse.json({ avatarUrl: dataUrl });
    }),
];
