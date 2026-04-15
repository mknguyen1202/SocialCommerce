import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../mocks/server';
import { createWrapper } from '../../../../test/renderWithProviders';
import { useFeed } from '../useFeed';

// Silence WebSocket / channel subscriptions — not needed for HTTP hook tests
vi.mock('../../../../shared/realtime/useSocket', () => ({
    useChannel: vi.fn(),
    useSocket: () => ({ send: vi.fn(), status: 'disconnected' }),
    useSocketStatus: () => 'disconnected',
}));

describe('useFeed — home feed (happy path)', () => {
    it('fetches /api/feed/home and returns the first page of posts', async () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useFeed('home', 'hot'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.posts.length).toBeGreaterThan(0);
    });

    it('maps posts to domain shape (id, author, score)', async () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useFeed('home', 'hot'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const first = result.current.posts[0];
        expect(typeof first.id).toBe('string');
        expect(typeof first.author.id).toBe('string');
        expect(typeof first.score).toBe('number');
        expect(first.createdAt).toBeInstanceOf(Date);
    });
});

describe('useFeed — explore feed', () => {
    it('fetches /api/feed/explore', async () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useFeed('explore', 'new'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.posts.length).toBeGreaterThan(0);
    });
});

describe('useFeed — sort param', () => {
    it('passes the sort query parameter to the API', async () => {
        let capturedUrl = '';
        server.use(
            http.get('*/api/feed/home', ({ request }) => {
                capturedUrl = request.url;
                return HttpResponse.json({ data: [], next_cursor: null, has_more: false });
            }),
        );

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useFeed('home', 'top'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(capturedUrl).toContain('sort=top');
    });
});

describe('useFeed — error state', () => {
    it('exposes isError when the server responds with 500', async () => {
        server.use(
            http.get('*/api/feed/:type', () =>
                HttpResponse.json({ message: 'internal server error' }, { status: 500 }),
            ),
        );

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useFeed('home', 'hot'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useFeed — empty feed', () => {
    it('posts is an empty array when the server returns no items', async () => {
        server.use(
            http.get('*/api/feed/:type', () =>
                HttpResponse.json({ data: [], next_cursor: null, has_more: false }),
            ),
        );

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useFeed('home', 'hot'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.posts).toHaveLength(0);
    });
});
