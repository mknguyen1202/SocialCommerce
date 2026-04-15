import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../mocks/server';
import { createWrapper } from '../../../../test/renderWithProviders';
import { useConversations, useCreateRoom, useMarkRead } from '../useConversations';
import { CONVERSATIONS } from '../../../../mocks/data/conversations';

// Silence socket manager errors — not relevant in unit tests
vi.mock('../../../../shared/realtime/useSocket', () => ({
    useChannel: vi.fn(),
    useSocket: () => ({ send: vi.fn(), status: 'disconnected' }),
    useSocketStatus: () => 'disconnected',
}));

// ─── Mapper ───────────────────────────────────────────────────────────────────
// mapConversation is not exported; we test it indirectly via useConversations

describe('useConversations — mapper', () => {
    it('maps server DTO to Conversation domain shape', async () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useConversations(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const first = result.current.data![0];
        expect(typeof first.id).toBe('string');
        expect(['dm', 'room']).toContain(first.type);
        expect(first.unreadCount).toBeGreaterThanOrEqual(0);
        // createdAt should be coerced to a Date
        expect(first.createdAt).toBeInstanceOf(Date);
    });

    it('maps lastMessage sub-object when present', async () => {
        const convWithMessage = {
            ...CONVERSATIONS[0],
            last_message: {
                id: 'msg-0',
                content: 'Hello',
                sender_display_name: 'Alex Johnson',
                sender_id: 'usr-1',
                sender_avatar_url: 'https://example.com/avatar.jpg',
                created_at: new Date().toISOString(),
            },
        };

        server.use(
            http.get('*/conversations', () => HttpResponse.json([convWithMessage])),
        );

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useConversations(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data![0].lastMessage?.content).toBe('Hello');
        expect(result.current.data![0].lastMessage?.createdAt).toBeInstanceOf(Date);
    });

    it('leaves lastMessage undefined when absent in DTO', async () => {
        const convNoMessage = { ...CONVERSATIONS[0], last_message: undefined };
        server.use(http.get('*/conversations', () => HttpResponse.json([convNoMessage])));

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useConversations(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data![0].lastMessage).toBeUndefined();
    });
});

// ─── useConversations ─────────────────────────────────────────────────────────

describe('useConversations', () => {
    it('returns the seed conversation list on success', async () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useConversations(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data!.length).toBe(CONVERSATIONS.length);
    });

    it('surfaces isError when the server returns 500', async () => {
        server.use(http.get('*/conversations', () => HttpResponse.json({ message: 'oops' }, { status: 500 })));

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useConversations(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ─── useCreateRoom ────────────────────────────────────────────────────────────

describe('useCreateRoom', () => {
    it('fires POST /conversations/rooms and invalidates the conversation list', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useCreateRoom(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.mutateAsync({ name: 'Test Room' });
        });

        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['conversations'] })
        );
    });
});

// ─── useMarkRead ──────────────────────────────────────────────────────────────

describe('useMarkRead', () => {
    it('fires POST /conversations/:id/read and invalidates the conversation list', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        const { result } = renderHook(() => useMarkRead(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.mutateAsync('conv-1');
        });

        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['conversations'] })
        );
    });
});
