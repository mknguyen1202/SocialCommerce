import { http, HttpResponse } from 'msw';
import { POSTS, COMMENTS } from '../data/posts';
import { GROUPS, GROUP_BY_SLUG } from '../data/groups';
import { USERS } from '../data/users';

const u = (id: string) => USERS.find((user) => user.id === id)!;
const now = () => new Date().toISOString();

function hashCode(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let posts: any[] = [...POSTS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let comments: Record<string, any[]> = { ...COMMENTS };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let groups: any[] = [...GROUPS];

function paginate<T>(items: T[], cursor: string | null, limit: number) {
    const offset = cursor ? parseInt(atob(cursor), 10) : 0;
    const slice = items.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < items.length;
    return { data: slice, next_cursor: hasMore ? btoa(String(nextOffset)) : null, has_more: hasMore };
}

export const socialHandlers = [
    // ── Feed ──────────────────────────────────────────────────────────────────

    http.get('*/api/feed/:type', ({ request, params }) => {
        const feedType = params.type as string;
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
        const cursor = url.searchParams.get('cursor') ?? null;
        const sort = url.searchParams.get('sort') ?? 'hot';

        let feed = [...posts];
        if (sort === 'new') {
            feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sort === 'top') {
            feed.sort((a, b) => b.upvotes - a.upvotes);
        } else {
            // hot: score weighted by recency
            feed.sort((a, b) => b.score - a.score);
        }

        if (feedType === 'home') {
            // home shows all posts
        } else if (feedType === 'explore') {
            feed = feed.filter((p) => !p.group_id);
        }

        return HttpResponse.json(paginate(feed, cursor, limit));
    }),

    // ── Group posts ───────────────────────────────────────────────────────────

    http.get('*/api/groups/:slug/posts', ({ request, params }) => {
        const { slug } = params;
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
        const cursor = url.searchParams.get('cursor') ?? null;
        const grouped = posts.filter((p) => p.group_slug === slug);
        return HttpResponse.json(paginate(grouped, cursor, limit));
    }),

    // ── Single post ───────────────────────────────────────────────────────────

    http.get('*/api/posts/:postId', ({ params }) => {
        const p = posts.find((p) => p.id === params.postId);
        if (!p) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(p);
    }),

    // ── Vote on post ──────────────────────────────────────────────────────────

    http.post('*/api/posts/:postId/vote', async ({ request, params }) => {
        const { direction } = (await request.json()) as { direction: 'up' | 'down' };
        posts = posts.map((p) =>
            p.id === params.postId ? { ...p, user_vote: direction, score: p.score + (direction === 'up' ? 1 : -1) } : p,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    http.delete('*/api/posts/:postId/vote', ({ params }) => {
        posts = posts.map((p) =>
            p.id === params.postId ? { ...p, user_vote: null } : p,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Save post ─────────────────────────────────────────────────────────────

    http.post('*/api/posts/:postId/save', ({ params }) => {
        posts = posts.map((p) =>
            p.id === params.postId ? { ...p, is_saved: true } : p,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    http.delete('*/api/posts/:postId/save', ({ params }) => {
        posts = posts.map((p) =>
            p.id === params.postId ? { ...p, is_saved: false } : p,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Share post ────────────────────────────────────────────────────────────

    http.post('*/api/posts/:postId/share', ({ params }) => {
        posts = posts.map((p) =>
            p.id === params.postId ? { ...p, share_count: p.share_count + 1 } : p,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Create post ───────────────────────────────────────────────────────────

    http.post('*/api/posts', async ({ request }) => {
        const body = (await request.json()) as {
            type: string;
            title: string;
            body: string;
            group_slug?: string;
            media_urls?: string[];
            link_url?: string;
        };
        const me = u('usr-1');
        const grp = body.group_slug ? GROUP_BY_SLUG[body.group_slug] : undefined;
        const newPost = {
            id: `post-${Date.now()}`,
            author_id: me.id,
            author_username: me.username,
            author_display_name: me.display_name,
            author_avatar_url: me.avatar_url,
            type: body.type ?? 'text',
            title: body.title,
            body: body.body,
            media_urls: body.media_urls ?? [],
            link_url: body.link_url,
            group_id: grp?.id,
            group_name: grp?.name,
            group_slug: grp?.slug,
            group_avatar_url: grp?.avatar_url,
            upvotes: 1,
            downvotes: 0,
            score: 1,
            user_vote: 'up' as 'up' | 'down' | null,
            comment_count: 0,
            share_count: 0,
            is_saved: false,
            created_at: now(),
            edited_at: undefined as string | undefined,
        };
        posts = [newPost, ...posts];
        return HttpResponse.json(newPost, { status: 201 });
    }),

    // ── Edit post ─────────────────────────────────────────────────────────────

    http.patch('*/api/posts/:postId', async ({ request, params }) => {
        const body = (await request.json()) as { title?: string; body?: string };
        posts = posts.map((p) =>
            p.id === params.postId ? { ...p, ...body, edited_at: now() } : p,
        );
        const updated = posts.find((p) => p.id === params.postId);
        return HttpResponse.json(updated);
    }),

    // ── Delete post ───────────────────────────────────────────────────────────

    http.delete('*/api/posts/:postId', ({ params }) => {
        posts = posts.filter((p) => p.id !== params.postId);
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Comments ──────────────────────────────────────────────────────────────

    http.get('*/api/posts/:postId/comments', ({ params }) => {
        const postComments = comments[params.postId as string] ?? [];
        return HttpResponse.json(postComments);
    }),

    http.post('*/api/posts/:postId/comments', async ({ request, params }) => {
        const body = (await request.json()) as { body: string; parent_id?: string };
        const me = u('usr-1');
        const newComment = {
            id: `cmt-${Date.now()}`,
            post_id: params.postId as string,
            parent_id: body.parent_id,
            author_id: me.id,
            author_username: me.username,
            author_display_name: me.display_name,
            author_avatar_url: me.avatar_url,
            body: body.body,
            upvotes: 1,
            downvotes: 0,
            score: 1,
            user_vote: 'up' as 'up' | 'down' | null,
            replies: [],
            reply_count: 0,
            created_at: now(),
            edited_at: undefined as string | undefined,
        };
        const pid = params.postId as string;
        comments = { ...comments, [pid]: [newComment, ...(comments[pid] ?? [])] };
        posts = posts.map((p) =>
            p.id === pid ? { ...p, comment_count: p.comment_count + 1 } : p,
        );
        return HttpResponse.json(newComment, { status: 201 });
    }),

    http.patch('*/api/comments/:commentId', async ({ request, params }) => {
        const { body } = (await request.json()) as { body: string };
        comments = Object.fromEntries(
            Object.entries(comments).map(([pid, cmts]) => [
                pid,
                cmts.map((c) => (c.id === params.commentId ? { ...c, body, edited_at: now() } : c)),
            ]),
        );
        return new HttpResponse(null, { status: 204 });
    }),

    http.delete('*/api/comments/:commentId', ({ params }) => {
        comments = Object.fromEntries(
            Object.entries(comments).map(([pid, cmts]) => [
                pid,
                cmts.filter((c) => c.id !== params.commentId),
            ]),
        );
        return new HttpResponse(null, { status: 204 });
    }),

    http.post('*/api/comments/:commentId/vote', async ({ request, params }) => {
        const { direction } = (await request.json()) as { direction: 'up' | 'down' };
        comments = Object.fromEntries(
            Object.entries(comments).map(([pid, cmts]) => [
                pid,
                cmts.map((c) =>
                    c.id === params.commentId
                        ? { ...c, user_vote: direction, score: c.score + (direction === 'up' ? 1 : -1) }
                        : c,
                ),
            ]),
        );
        return new HttpResponse(null, { status: 204 });
    }),

    http.delete('*/api/comments/:commentId/vote', ({ params }) => {
        comments = Object.fromEntries(
            Object.entries(comments).map(([pid, cmts]) => [
                pid,
                cmts.map((c) => (c.id === params.commentId ? { ...c, user_vote: null } : c)),
            ]),
        );
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Groups ────────────────────────────────────────────────────────────────

    http.get('*/api/groups/mine', () => {
        return HttpResponse.json(groups.filter((g) => g.user_role !== null));
    }),

    http.get('*/api/groups', ({ request }) => {
        const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
        return HttpResponse.json(groups.filter((g) => g.name.toLowerCase().includes(q)));
    }),

    http.get('*/api/groups/:slug', ({ params }) => {
        const grp = GROUP_BY_SLUG[params.slug as string];
        if (!grp) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(grp);
    }),

    http.post('*/api/groups', async ({ request }) => {
        const body = (await request.json()) as { name: string; description?: string; visibility?: string };
        const newGroup = {
            id: `grp-${Date.now()}`,
            name: body.name,
            slug: body.name.toLowerCase().replace(/\s+/g, '-'),
            description: body.description ?? '',
            avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(body.name)}`,
            banner_url: `https://picsum.photos/seed/${encodeURIComponent(body.name)}/1200/300`,
            visibility: body.visibility ?? 'public',
            member_count: 1,
            rules: [],
            user_role: 'owner' as string | null,
            created_at: now(),
        };
        groups = [newGroup, ...groups];
        return HttpResponse.json(newGroup, { status: 201 });
    }),

    http.post('*/api/groups/:slug/join', ({ params }) => {
        groups = groups.map((g) =>
            g.slug === params.slug ? { ...g, member_count: g.member_count + 1, user_role: 'member' } : g,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    http.post('*/api/groups/:slug/leave', ({ params }) => {
        groups = groups.map((g) =>
            g.slug === params.slug ? { ...g, member_count: g.member_count - 1, user_role: null } : g,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    http.patch('*/api/groups/:slug/rules', async ({ request, params }) => {
        const { rules } = (await request.json()) as { rules: unknown[] };
        groups = groups.map((g) =>
            g.slug === params.slug ? { ...g, rules: rules as typeof g.rules } : g,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    http.get('*/api/groups/:slug/bans', () => {
        return HttpResponse.json([]);
    }),

    http.post('*/api/groups/:slug/bans', () => {
        return new HttpResponse(null, { status: 204 });
    }),

    http.delete('*/api/groups/:slug/bans/:userId', () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // ── User profiles & wall ──────────────────────────────────────────────────

    http.get('*/api/users/:userId/profile', ({ params }) => {
        const usr = u(params.userId as string);
        if (!usr) return new HttpResponse(null, { status: 404 });
        const userPosts = posts.filter((p) => p.author_id === usr.id);
        return HttpResponse.json({
            id: usr.id,
            username: usr.username,
            display_name: usr.display_name,
            avatar_url: usr.avatar_url,
            post_count: userPosts.length,
            follower_count: Math.floor(Math.abs(hashCode(usr.id)) % 800) + 50,
            following_count: Math.floor(Math.abs(hashCode(usr.id + 'f')) % 300) + 10,
        });
    }),

    // Wall feed: posts by a specific author (reuses group posts endpoint shape)
    http.get('*/api/groups/wall\\::userId/posts', ({ request, params }) => {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
        const cursor = url.searchParams.get('cursor') ?? null;
        const wallPosts = posts
            .filter((p) => p.author_id === (params.userId as string))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return HttpResponse.json(paginate(wallPosts, cursor, limit));
    }),
];
