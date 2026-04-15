import { http, HttpResponse } from 'msw';
import { USERS } from '../data/users';
import { PRODUCTS } from '../data/products';
import { POSTS } from '../data/posts';
import { THEATERS } from '../data/theaters';

const ago = (days: number, hours = 0) =>
    new Date(Date.now() - days * 864e5 - hours * 3600e3).toISOString();

// Mutable in-session notifications list
let notifications = [
    {
        id: 'notif-1',
        domain: 'social',
        type: 'reply',
        title: 'Sarah McKenzie replied to your post',
        body: '"Cannot agree more. noUncheckedIndexedAccess alone has caught so many bugs."',
        link_url: '/social/posts/post-1',
        actor_id: 'usr-2',
        actor_name: 'Sarah McKenzie',
        actor_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarahmk',
        is_read: false,
        created_at: ago(0, 3),
    },
    {
        id: 'notif-2',
        domain: 'commerce',
        type: 'order_update',
        title: 'Your order has shipped',
        body: 'Order #ord-2 — Adjustable Dumbbell Set is on its way.',
        link_url: '/commerce/orders/ord-2',
        actor_id: undefined,
        actor_name: undefined,
        actor_avatar_url: undefined,
        is_read: false,
        created_at: ago(1),
    },
    {
        id: 'notif-3',
        domain: 'streaming',
        type: 'theater_live',
        title: 'Sarah McKenzie just went live',
        body: '"Live Code Review: Building a Design System from scratch"',
        link_url: '/streaming/theaters/thtr-1',
        actor_id: 'usr-2',
        actor_name: 'Sarah McKenzie',
        actor_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarahmk',
        is_read: true,
        created_at: ago(0, 1),
    },
    {
        id: 'notif-4',
        domain: 'social',
        type: 'reaction',
        title: 'Dave Okonkwo reacted to your post',
        body: '👍 on "Tried 5 different standing desk mats"',
        link_url: '/social/posts/post-5',
        actor_id: 'usr-3',
        actor_name: 'Dave Okonkwo',
        actor_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devdave',
        is_read: true,
        created_at: ago(2),
    },
    {
        id: 'notif-5',
        domain: 'communication',
        type: 'new_message',
        title: 'New message from Priya Ramesh',
        body: 'The merino sweaters just dropped — thought you\'d want first pick.',
        link_url: '/communication/conversations/conv-3',
        actor_id: 'usr-4',
        actor_name: 'Priya Ramesh',
        actor_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya_r',
        is_read: true,
        created_at: ago(1),
    },
];

// Activity feed events
const activityEvents = [
    {
        id: 'act-1',
        type: 'user_posted',
        actor: { id: 'usr-2', username: 'sarahmk', display_name: 'Sarah McKenzie', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarahmk', presence: 'online' },
        title: 'Sarah McKenzie posted in Dev Talk',
        body: 'Why TypeScript strict mode is non-negotiable in 2026',
        link_url: '/social/posts/post-1',
        domain: 'social',
        created_at: ago(0, 2),
    },
    {
        id: 'act-2',
        type: 'user_is_live',
        actor: { id: 'usr-2', username: 'sarahmk', display_name: 'Sarah McKenzie', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarahmk', presence: 'online' },
        title: 'Sarah McKenzie is streaming live',
        body: 'Live Code Review: Building a Design System from scratch',
        link_url: '/streaming/theaters/thtr-1',
        domain: 'streaming',
        created_at: ago(0, 1),
    },
    {
        id: 'act-3',
        type: 'shop_sale',
        actor: { id: 'usr-6', username: 'lunaboutique', display_name: 'Luna Boutique', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lunaboutique', presence: 'online' },
        title: 'Luna Boutique started a sale',
        body: 'Up to 25% off wireless headphones and beauty sets',
        link_url: '/commerce/browse?vendor=lunaboutique',
        domain: 'commerce',
        created_at: ago(1),
    },
    {
        id: 'act-4',
        type: 'user_posted',
        actor: { id: 'usr-3', username: 'devdave', display_name: 'Dave Okonkwo', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devdave', presence: 'idle' },
        title: 'Dave Okonkwo posted in Dev Talk',
        body: 'React 20 concurrent features every developer should know',
        link_url: '/social/posts/post-7',
        domain: 'social',
        created_at: ago(2),
    },
    {
        id: 'act-5',
        type: 'theater_started',
        actor: { id: 'usr-3', username: 'devdave', display_name: 'Dave Okonkwo', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devdave', presence: 'idle' },
        title: 'Dave Okonkwo hosted a live session',
        body: 'React 20 deep-dive: use() hook and async components — now available as a recording',
        link_url: '/streaming/theaters/thtr-3',
        domain: 'streaming',
        created_at: ago(6),
    },
];

function paginate<T>(items: T[], cursor: string | null, limit: number) {
    const offset = cursor ? parseInt(atob(cursor), 10) : 0;
    const slice = items.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < items.length;
    return {
        items: slice,
        next_cursor: hasMore ? btoa(String(nextOffset)) : null,
    };
}

export const activityHandlers = [
    // Activity feed (infinite, cursor-based)
    http.get('*/api/activity', ({ request }) => {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
        const cursor = url.searchParams.get('cursor') ?? null;
        return HttpResponse.json(paginate(activityEvents, cursor, limit));
    }),

    // Notifications list
    http.get('*/api/notifications', () => {
        return HttpResponse.json(notifications);
    }),

    // Mark single notification as read
    http.post('*/api/notifications/:notificationId/read', ({ params }) => {
        const { notificationId } = params;
        notifications = notifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    // Mark all notifications as read
    http.post('*/api/notifications/read-all', () => {
        notifications = notifications.map((n) => ({ ...n, is_read: true }));
        return new HttpResponse(null, { status: 204 });
    }),

    // Unified search
    http.get('*/api/search', ({ request }) => {
        const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
        return HttpResponse.json({
            query: q,
            users: USERS.filter(
                (u) => u.username.includes(q) || u.display_name.toLowerCase().includes(q),
            )
                .slice(0, 5)
                .map((u) => ({
                    id: u.id,
                    username: u.username,
                    display_name: u.display_name,
                    avatar_url: u.avatar_url,
                    presence: u.presence,
                })),
            posts: POSTS.filter((p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q))
                .slice(0, 5)
                .map((p) => ({
                    id: p.id,
                    title: p.title,
                    author_name: p.author_display_name,
                    group_name: p.group_name,
                    score: p.score,
                })),
            theaters: THEATERS.filter((t) => t.title.toLowerCase().includes(q))
                .slice(0, 5)
                .map((t) => ({
                    id: t.id,
                    title: t.title,
                    host_name: t.host_display_name,
                    status: t.status,
                    viewer_count: t.viewer_count,
                })),
            products: PRODUCTS.filter(
                (p) => p.title.toLowerCase().includes(q) || p.tags.some((tag: string) => tag.includes(q)),
            )
                .slice(0, 5)
                .map((p) => ({
                    id: p.id,
                    title: p.title,
                    vendor_name: p.vendor.name,
                    price: p.price,
                    thumbnail_url: p.images[0]?.url,
                })),
        });
    }),
];
