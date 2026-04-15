import { http, HttpResponse } from 'msw';
import { CONVERSATIONS, MESSAGES } from '../data/conversations';
import { USERS } from '../data/users';

const u = (id: string) => USERS.find((user) => user.id === id)!;
const now = () => new Date().toISOString();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let conversations: any[] = [...CONVERSATIONS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let messages: Record<string, any[]> = { ...MESSAGES };

function paginate<T>(items: T[], cursor: string | null, limit: number) {
    const offset = cursor ? parseInt(atob(cursor), 10) : 0;
    const slice = items.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < items.length;
    return { data: slice, next_cursor: hasMore ? btoa(String(nextOffset)) : null, has_more: hasMore };
}

export const communicationHandlers = [
    // ── Conversations list ────────────────────────────────────────────────────

    // Note: communication hooks use /conversations/... without /api/ prefix
    http.get('*/conversations', ({ request }) => {
        const url = new URL(request.url);
        // Ensure this doesn't match /conversations/:id/messages paths
        if (url.pathname.split('/').filter(Boolean).length > 1) return;
        return HttpResponse.json(conversations);
    }),

    // ── Create room ───────────────────────────────────────────────────────────

    http.post('*/conversations/rooms', async ({ request }) => {
        const body = (await request.json()) as { name: string; description?: string };
        const me = u('usr-1');
        const newConv = {
            id: `conv-${Date.now()}`,
            type: 'room' as const,
            name: body.name,
            avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(body.name)}`,
            participant_ids: [me.id],
            last_message: undefined as typeof conversations[0]['last_message'] | undefined,
            unread_count: 0,
            created_at: now(),
        };
        conversations = [newConv, ...conversations];
        return HttpResponse.json(newConv, { status: 201 });
    }),

    // ── Mark conversation as read ─────────────────────────────────────────────

    http.post('*/conversations/:conversationId/read', ({ params }) => {
        conversations = conversations.map((c) =>
            c.id === params.conversationId ? { ...c, unread_count: 0 } : c,
        );
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Messages (paginated, newest first)  ───────────────────────────────────

    http.get('*/conversations/:conversationId/messages', ({ request, params }) => {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') ?? '20', 10);
        const cursor = url.searchParams.get('cursor') ?? null;
        const convMessages = [...(messages[params.conversationId as string] ?? [])].reverse();
        return HttpResponse.json(paginate(convMessages, cursor, limit));
    }),

    // ── Send message ──────────────────────────────────────────────────────────

    http.post('*/conversations/:conversationId/messages', async ({ request, params }) => {
        const body = (await request.json()) as {
            content: string;
            reply_to_id?: string;
            attachment_ids?: string[];
        };
        const me = u('usr-1');
        const convId = params.conversationId as string;
        const newMsg = {
            id: `msg-${Date.now()}`,
            conversation_id: convId,
            sender_id: me.id,
            sender_display_name: me.display_name,
            sender_avatar_url: me.avatar_url,
            sender_username: me.username,
            content: body.content,
            status: 'sent',
            created_at: now(),
            edited_at: undefined as string | undefined,
            reply_to_id: body.reply_to_id,
            reply_to_content: undefined as string | undefined,
            reply_to_sender_name: undefined as string | undefined,
            attachments: [],
            reactions: [],
        };

        // Resolve reply_to content for display
        if (body.reply_to_id) {
            const replyTo = (messages[convId] ?? []).find((m) => m.id === body.reply_to_id);
            if (replyTo) {
                newMsg.reply_to_content = replyTo.content;
                newMsg.reply_to_sender_name = replyTo.sender_display_name;
            }
        }

        messages = { ...messages, [convId]: [...(messages[convId] ?? []), newMsg] };

        // Update last_message on the conversation
        conversations = conversations.map((c) =>
            c.id === convId
                ? {
                    ...c,
                    last_message: {
                        id: newMsg.id,
                        content: newMsg.content,
                        sender_id: me.id,
                        sender_display_name: me.display_name,
                        sender_avatar_url: me.avatar_url,
                        created_at: newMsg.created_at,
                    },
                }
                : c,
        );

        return HttpResponse.json(newMsg, { status: 201 });
    }),

    // ── Edit message ──────────────────────────────────────────────────────────

    http.patch('*/conversations/:conversationId/messages/:messageId', async ({ request, params }) => {
        const { content } = (await request.json()) as { content: string };
        const convId = params.conversationId as string;
        messages = {
            ...messages,
            [convId]: (messages[convId] ?? []).map((m) =>
                m.id === params.messageId ? { ...m, content, edited_at: now() } : m,
            ),
        };
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Delete message ────────────────────────────────────────────────────────

    http.delete('*/conversations/:conversationId/messages/:messageId', ({ params }) => {
        const convId = params.conversationId as string;
        messages = {
            ...messages,
            [convId]: (messages[convId] ?? []).filter((m) => m.id !== params.messageId),
        };
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Reactions ─────────────────────────────────────────────────────────────

    http.post(
        '*/conversations/:conversationId/messages/:messageId/reactions',
        async ({ request, params }) => {
            const { emoji } = (await request.json()) as { emoji: string };
            const me = u('usr-1');
            const convId = params.conversationId as string;
            messages = {
                ...messages,
                [convId]: (messages[convId] ?? []).map((m) => {
                    if (m.id !== params.messageId) return m;
                    const existing = (m.reactions as Array<{ emoji: string; user_ids: string[]; count: number }>)
                        .find((r) => r.emoji === emoji);
                    if (existing) {
                        return {
                            ...m,
                            reactions: (m.reactions as Array<{ emoji: string; user_ids: string[]; count: number }>)
                                .map((r) =>
                                    r.emoji === emoji
                                        ? { ...r, user_ids: [...r.user_ids, me.id], count: r.count + 1 }
                                        : r,
                                ),
                        };
                    }
                    return {
                        ...m,
                        reactions: [...(m.reactions as unknown[]), { emoji, user_ids: [me.id], count: 1 }],
                    };
                }),
            };
            return new HttpResponse(null, { status: 204 });
        },
    ),
];
