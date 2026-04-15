import { http, HttpResponse } from 'msw';
import { THEATERS, THEATER_PARTICIPANTS } from '../data/theaters';
import { USERS } from '../data/users';

const u = (id: string) => USERS.find((user) => user.id === id)!;
const now = () => new Date().toISOString();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let theaters: any[] = [...THEATERS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let participants: Record<string, any[]> = { ...THEATER_PARTICIPANTS };

function paginate<T>(items: T[], cursor: string | null, limit: number) {
    const offset = cursor ? parseInt(atob(cursor), 10) : 0;
    const slice = items.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < items.length;
    return { data: slice, next_cursor: hasMore ? btoa(String(nextOffset)) : null, has_more: hasMore };
}

export const streamingHandlers = [
    // ── Theaters list ─────────────────────────────────────────────────────────

    http.get('*/api/theaters', ({ request }) => {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') ?? '12', 10);
        const cursor = url.searchParams.get('cursor') ?? null;
        const category = url.searchParams.get('category');
        const status = url.searchParams.get('status');
        const q = url.searchParams.get('q')?.toLowerCase();

        let filtered = [...theaters];
        if (category) filtered = filtered.filter((t) => t.category === category);
        if (status) filtered = filtered.filter((t) => t.status === status);
        if (q) filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));

        return HttpResponse.json(paginate(filtered, cursor, limit));
    }),

    // ── Single theater ────────────────────────────────────────────────────────

    http.get('*/api/theaters/:id', ({ params }) => {
        const theater = theaters.find((t) => t.id === params.id);
        if (!theater) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(theater);
    }),

    // ── Participants list ─────────────────────────────────────────────────────

    http.get('*/api/theaters/:theaterId/participants', ({ request, params }) => {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
        const cursor = url.searchParams.get('cursor') ?? null;
        const theaterParticipants = participants[params.theaterId as string] ?? [];
        return HttpResponse.json(
            paginate(theaterParticipants as unknown[], cursor, limit),
        );
    }),

    // ── Create theater ────────────────────────────────────────────────────────

    http.post('*/api/theaters', async ({ request }) => {
        const body = (await request.json()) as {
            title: string;
            description?: string;
            category?: string;
            tags?: string[];
            visibility?: string;
            content_source_type?: string;
            content_source_url?: string;
            scheduled_at?: string;
            max_viewers?: number;
        };
        const me = u('usr-1');
        const newTheater = {
            id: `thtr-${Date.now()}`,
            host_id: me.id,
            host_username: me.username,
            host_display_name: me.display_name,
            host_avatar_url: me.avatar_url,
            title: body.title,
            description: body.description ?? '',
            category: body.category ?? 'General',
            tags: body.tags ?? [],
            visibility: body.visibility ?? 'public',
            status: body.scheduled_at ? 'scheduled' : 'created',
            content_source_type: body.content_source_type ?? 'screen_share',
            content_source_url: body.content_source_url,
            content_source_media_id: undefined as string | undefined,
            viewer_count: 0,
            max_viewers: body.max_viewers,
            scheduled_at: body.scheduled_at,
            started_at: undefined as string | undefined,
            ended_at: undefined as string | undefined,
            created_at: now(),
        };
        theaters = [newTheater, ...theaters];
        participants = { ...participants, [newTheater.id]: [] };
        return HttpResponse.json(newTheater, { status: 201 });
    }),

    // ── Update theater status (start/pause/end) ───────────────────────────────

    http.patch('*/api/theaters/:theaterId/status', async ({ request, params }) => {
        const { status } = (await request.json()) as { status: string };
        theaters = theaters.map((t) => {
            if (t.id !== params.theaterId) return t;
            return {
                ...t,
                status,
                started_at: status === 'live' && !t.started_at ? now() : t.started_at,
                ended_at: status === 'ended' ? now() : t.ended_at,
            };
        });
        const theater = theaters.find((t) => t.id === params.theaterId);
        return HttpResponse.json(theater);
    }),

    // ── Join theater ──────────────────────────────────────────────────────────

    http.post('*/api/theaters/:theaterId/join', ({ params }) => {
        const me = u('usr-1');
        const theaterId = params.theaterId as string;
        theaters = theaters.map((t) =>
            t.id === theaterId ? { ...t, viewer_count: t.viewer_count + 1 } : t,
        );
        const alreadyIn = (participants[theaterId] ?? []).some(
            (p) => (p as { user_id: string }).user_id === me.id,
        );
        if (!alreadyIn) {
            participants = {
                ...participants,
                [theaterId]: [
                    ...(participants[theaterId] ?? []),
                    {
                        user_id: me.id,
                        user_username: me.username,
                        user_display_name: me.display_name,
                        user_avatar_url: me.avatar_url,
                        role: 'viewer',
                        joined_at: now(),
                        is_chat_muted: false,
                    },
                ],
            };
        }
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Leave theater ─────────────────────────────────────────────────────────

    http.post('*/api/theaters/:theaterId/leave', ({ params }) => {
        const me = u('usr-1');
        const theaterId = params.theaterId as string;
        theaters = theaters.map((t) =>
            t.id === theaterId ? { ...t, viewer_count: Math.max(0, t.viewer_count - 1) } : t,
        );
        participants = {
            ...participants,
            [theaterId]: (participants[theaterId] ?? []).filter(
                (p) => (p as { user_id: string }).user_id !== me.id,
            ),
        };
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Remove participant ────────────────────────────────────────────────────

    http.delete('*/api/theaters/:theaterId/participants/:userId', ({ params }) => {
        const theaterId = params.theaterId as string;
        participants = {
            ...participants,
            [theaterId]: (participants[theaterId] ?? []).filter(
                (p) => (p as { user_id: string }).user_id !== params.userId,
            ),
        };
        theaters = theaters.map((t) =>
            t.id === theaterId ? { ...t, viewer_count: Math.max(0, t.viewer_count - 1) } : t,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Chat mute participant ─────────────────────────────────────────────────

    http.patch('*/api/theaters/:theaterId/participants/:userId/chat-mute', async ({ request, params }) => {
        const { mute } = (await request.json()) as { mute: boolean };
        const theaterId = params.theaterId as string;
        participants = {
            ...participants,
            [theaterId]: (participants[theaterId] ?? []).map((p) =>
                (p as { user_id: string }).user_id === params.userId
                    ? { ...(p as object), is_chat_muted: mute }
                    : p,
            ),
        };
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Delete chat message ───────────────────────────────────────────────────

    http.delete('*/api/theaters/:theaterId/chat/:messageId', () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Slow mode ─────────────────────────────────────────────────────────────

    http.patch('*/api/theaters/:theaterId/slow-mode', () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Invite users ──────────────────────────────────────────────────────────

    http.post('*/api/theaters/:theaterId/invite', () => {
        return new HttpResponse(null, { status: 204 });
    }),
];
