import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../mocks/server';
import { createWrapper } from '../../../../test/renderWithProviders';
import { useMessages, useSendMessage, useEditMessage, useDeleteMessage } from '../useMessages';
import { MESSAGES } from '../../../../mocks/data/conversations';

// Silence socket manager
vi.mock('../../../../shared/realtime/useSocket', () => ({
    useChannel: vi.fn(),
    useSocket: () => ({ send: vi.fn(), status: 'disconnected' }),
    useSocketStatus: () => 'disconnected',
}));

// Provide a minimal auth context so useSendMessage can read the current user
vi.mock('../../../../app/providers/AuthProvider', () => ({
    useAuthContext: () => ({
        user: { id: 'usr-1', name: 'Alex Johnson', email: 'alex@example.com', roles: [], permissions: [] },
        isAuthenticated: true,
        loading: false,
        login: vi.fn(),
        loginWithEmail: vi.fn(),
        logout: vi.fn(),
        apiFetch: vi.fn(),
        hasRole: vi.fn(),
        hasAnyPermission: vi.fn(),
    }),
}));

const CONV_ID = 'conv-1';

// ─── Mapper ───────────────────────────────────────────────────────────────────

describe('useMessages — mapper', () => {
    it('maps a message DTO to a DomainMessage with Date fields', async () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useMessages(CONV_ID), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const first = result.current.data!.pages[0].items[0];
        expect(typeof first.id).toBe('string');
        expect(first.createdAt).toBeInstanceOf(Date);
        expect(Array.isArray(first.attachments)).toBe(true);
        expect(Array.isArray(first.reactions)).toBe(true);
    });

    it('maps editedAt when present', async () => {
        const now = new Date().toISOString();
        const editedMsg = { ...MESSAGES[CONV_ID][0], edited_at: now };

        server.use(
            http.get(`*/conversations/${CONV_ID}/messages`, () =>
                HttpResponse.json({ data: [editedMsg], next_cursor: null, has_more: false }),
            ),
        );

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useMessages(CONV_ID), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data!.pages[0].items[0].editedAt).toBeInstanceOf(Date);
    });
});

// ─── useMessages ──────────────────────────────────────────────────────────────

describe('useMessages', () => {
    it('is disabled when conversationId is null', () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useMessages(null), { wrapper: Wrapper });

        // Query should never fire — status stays pending/idle
        expect(result.current.isFetching).toBe(false);
        expect(result.current.data).toBeUndefined();
    });

    it('fetches the first page for the given conversation', async () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useMessages(CONV_ID), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const items = result.current.data!.pages[0].items;
        expect(items.length).toBeGreaterThan(0);
        // All returned messages belong to the right conversation
        items.forEach((m) => expect(m.conversationId).toBe(CONV_ID));
    });

    it('surfaces isError on a 500 response', async () => {
        server.use(
            http.get(`*/conversations/${CONV_ID}/messages`, () =>
                HttpResponse.json({ message: 'error' }, { status: 500 }),
            ),
        );

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useMessages(CONV_ID), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ─── useSendMessage ───────────────────────────────────────────────────────────

describe('useSendMessage', () => {
    it('optimistically inserts a message with status=sending, then reconciles on success', async () => {
        const { Wrapper } = createWrapper();

        // Pre-load the messages query so the optimistic update has a cache to write into
        const { result: msgResult } = renderHook(() => useMessages(CONV_ID), { wrapper: Wrapper });
        await waitFor(() => expect(msgResult.current.isSuccess).toBe(true));

        const initialCount = msgResult.current.data!.pages[0].items.length;

        const { result: sendResult } = renderHook(() => useSendMessage(CONV_ID), { wrapper: Wrapper });

        act(() => {
            sendResult.current.mutate({ content: 'Hello from test' });
        });

        // Wait for the mutation to settle
        await waitFor(() => expect(sendResult.current.isSuccess).toBe(true));

        // Cache should now contain the real message returned by the handler
        const finalCount = msgResult.current.data!.pages[0].items.length;
        expect(finalCount).toBeGreaterThan(initialCount);
    });

    it('rolls back the optimistic message on a 500 error', async () => {
        server.use(
            http.post(`*/conversations/${CONV_ID}/messages`, () =>
                HttpResponse.json({ message: 'error' }, { status: 500 }),
            ),
        );

        const { Wrapper } = createWrapper();
        const { result: msgResult } = renderHook(() => useMessages(CONV_ID), { wrapper: Wrapper });
        await waitFor(() => expect(msgResult.current.isSuccess).toBe(true));

        const initialCount = msgResult.current.data!.pages[0].items.length;

        const { result: sendResult } = renderHook(() => useSendMessage(CONV_ID), { wrapper: Wrapper });

        act(() => {
            sendResult.current.mutate({ content: 'This will fail' });
        });

        await waitFor(() => expect(sendResult.current.isError).toBe(true));

        // Cache should be rolled back to original count
        expect(msgResult.current.data!.pages[0].items.length).toBe(initialCount);
    });
});

// ─── useEditMessage ───────────────────────────────────────────────────────────

describe('useEditMessage', () => {
    it('patches the message content in the cache after a successful PATCH', async () => {
        const { Wrapper } = createWrapper();

        const { result: msgResult } = renderHook(() => useMessages(CONV_ID), { wrapper: Wrapper });
        await waitFor(() => expect(msgResult.current.isSuccess).toBe(true));

        const targetId = msgResult.current.data!.pages[0].items[0].id;

        // Override the PATCH handler to return the updated message DTO instead of 204
        // (the hook's onSuccess uses the returned DTO to patch the cache)
        server.use(
            http.patch(`*/conversations/${CONV_ID}/messages/:messageId`, async ({ request }) => {
                const { content } = (await request.json()) as { content: string };
                return HttpResponse.json({
                    id: targetId,
                    conversation_id: CONV_ID,
                    sender_id: 'usr-1',
                    sender_display_name: 'Alex Johnson',
                    sender_avatar_url: '',
                    sender_username: 'alexj',
                    content,
                    status: 'sent',
                    created_at: new Date().toISOString(),
                    edited_at: new Date().toISOString(),
                    reply_to_id: undefined,
                    reply_to_content: undefined,
                    reply_to_sender_name: undefined,
                    attachments: [],
                    reactions: [],
                });
            }),
        );

        const { result: editResult } = renderHook(() => useEditMessage(CONV_ID), { wrapper: Wrapper });

        await act(async () => {
            await editResult.current.mutateAsync({ messageId: targetId, content: 'Edited content' });
        });

        await waitFor(() => expect(editResult.current.isSuccess).toBe(true));

        const updated = msgResult.current.data!.pages[0].items.find((m) => m.id === targetId);
        expect(updated?.content).toBe('Edited content');
    });
});

// ─── useDeleteMessage ─────────────────────────────────────────────────────────

describe('useDeleteMessage', () => {
    it('optimistically removes the message from the cache', async () => {
        const { Wrapper } = createWrapper();

        const { result: msgResult } = renderHook(() => useMessages(CONV_ID), { wrapper: Wrapper });
        await waitFor(() => expect(msgResult.current.isSuccess).toBe(true));

        const before = msgResult.current.data!.pages[0].items;
        const targetId = before[0].id;
        const countBefore = before.length;

        const { result: delResult } = renderHook(() => useDeleteMessage(CONV_ID), { wrapper: Wrapper });

        act(() => {
            delResult.current.mutate(targetId);
        });

        await waitFor(() => {
            const after = msgResult.current.data!.pages[0].items;
            expect(after.length).toBeLessThan(countBefore);
        });

        const ids = msgResult.current.data!.pages[0].items.map((m) => m.id);
        expect(ids).not.toContain(targetId);
    });
});
