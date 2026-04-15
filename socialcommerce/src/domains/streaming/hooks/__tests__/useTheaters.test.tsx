import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../mocks/server';
import { createWrapper } from '../../../../test/renderWithProviders';
import {
    useTheaters,
    useTheater,
    useJoinTheater,
    useCreateTheater,
} from '../useTheaters';
import { THEATERS } from '../../../../mocks/data/theaters';

vi.mock('../../../../shared/realtime/useSocket', () => ({
    useSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
    useChannel: vi.fn(),
}));

// ─── useTheaters (infinite list) ─────────────────────────────────────────────

describe('useTheaters', () => {
    it('fetches the first page of theaters', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useTheaters(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const firstPage = result.current.data!.pages[0];
        expect(firstPage.items.length).toBeGreaterThan(0);
        expect(firstPage.items.length).toBeLessThanOrEqual(THEATERS.length);
        queryClient.clear();
    });

    it('maps the domain shape correctly', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useTheaters(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const firstItem = result.current.data!.pages[0].items[0];
        expect(firstItem).toMatchObject({
            id: expect.any(String),
            host: expect.objectContaining({ id: expect.any(String) }),
            title: expect.any(String),
            status: expect.any(String),
            viewerCount: expect.any(Number),
            createdAt: expect.any(Date),
        });
        queryClient.clear();
    });

    it('filters by status', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useTheaters({ status: 'live' }), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const items = result.current.data!.pages[0].items;
        expect(items.every((t) => t.status === 'live')).toBe(true);
        queryClient.clear();
    });

    it('is in error state on 500', async () => {
        server.use(
            http.get('*/api/theaters', () => new HttpResponse(null, { status: 500 }))
        );
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useTheaters(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ─── useTheater (single) ──────────────────────────────────────────────────────

describe('useTheater', () => {
    it('fetches a single theater by id', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useTheater('thtr-1'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data!.id).toBe('thtr-1');
        expect(result.current.data!.status).toBe('live');
        queryClient.clear();
    });

    it('is disabled when id is empty string', () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useTheater(''), { wrapper: Wrapper });

        expect(result.current.isPending).toBe(true);
        expect(result.current.isFetchedAfterMount).toBe(false);
    });

    it('is in error state on 404', async () => {
        server.use(
            http.get('*/api/theaters/:id', () => new HttpResponse(null, { status: 404 }))
        );
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useTheater('thtr-does-not-exist'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ─── useJoinTheater ───────────────────────────────────────────────────────────

describe('useJoinTheater', () => {
    it('posts to /api/theaters/:id/join and resolves (default handler returns 204)', async () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useJoinTheater(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.mutateAsync('thtr-1');
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        await act(async () => {
            await result.current.mutateAsync('thtr-1');
        });

        expect(result.current.isSuccess).toBe(true);
    });
});

// ─── useCreateTheater ─────────────────────────────────────────────────────────

describe('useCreateTheater', () => {
    it('posts to /api/theaters and returns a mapped theater', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useCreateTheater(), { wrapper: Wrapper });

        let created: Awaited<ReturnType<typeof result.current.mutateAsync>>;
        await act(async () => {
            created = await result.current.mutateAsync({
                title: 'Test Theater',
                description: 'A test',
                category: 'Technology',
                tags: [],
                visibility: 'public',
                contentSource: { type: 'screen_share' },
            });
        });

        expect(created!.id).toMatch(/^thtr-/);
        expect(created!.title).toBe('Test Theater');
        queryClient.clear();
    });

    it('invalidates the theaters query on success', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderHook(() => useCreateTheater(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                title: 'Another Theater',
                description: '',
                category: 'General',
                tags: [],
                visibility: 'public',
                contentSource: { type: 'screen_share' },
            });
        });

        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['theaters'] })
        );
        queryClient.clear();
    });
});
