import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../mocks/server';
import { createWrapper } from '../../../../test/renderWithProviders';
import {
    useProducts,
    useProduct,
    useCategories,
    useProductReviews,
    useSubmitReview,
} from '../useProducts';
import { PRODUCTS, CATEGORIES } from '../../../../mocks/data/products';

// ─── useProducts (infinite list) ─────────────────────────────────────────────

describe('useProducts', () => {
    it('fetches the first page of products', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useProducts(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const firstPage = result.current.data!.pages[0];
        expect(firstPage.items.length).toBeGreaterThan(0);
        expect(firstPage.items.length).toBeLessThanOrEqual(PRODUCTS.length);
        queryClient.clear();
    });

    it('maps domain shape correctly', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useProducts(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const item = result.current.data!.pages[0].items[0];
        expect(item).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            price: expect.objectContaining({ amount: expect.any(Number), currency: 'USD' }),
            vendor: expect.objectContaining({ id: expect.any(String) }),
            category: expect.objectContaining({ id: expect.any(String) }),
            createdAt: expect.any(Date),
        });
        queryClient.clear();
    });

    it('is in error state on 500', async () => {
        server.use(
            http.get('*/api/products', () => new HttpResponse(null, { status: 500 }))
        );
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useProducts(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ─── useProduct (single) ──────────────────────────────────────────────────────

describe('useProduct', () => {
    it('fetches a single product by id', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useProduct('prod-1'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data!.id).toBe('prod-1');
        expect(result.current.data!.title).toBe('Wireless Noise-Cancelling Headphones');
        queryClient.clear();
    });

    it('is disabled when id is empty string', () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useProduct(''), { wrapper: Wrapper });

        expect(result.current.isPending).toBe(true);
        expect(result.current.isFetchedAfterMount).toBe(false);
    });

    it('is in error state on 404', async () => {
        server.use(
            http.get('*/api/products/:id', () => new HttpResponse(null, { status: 404 }))
        );
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useProduct('prod-not-found'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ─── useCategories ────────────────────────────────────────────────────────────

describe('useCategories', () => {
    it('fetches all categories', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useCategories(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(CATEGORIES.length);
        expect(result.current.data![0]).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            slug: expect.any(String),
        });
        queryClient.clear();
    });
});

// ─── useProductReviews ────────────────────────────────────────────────────────

describe('useProductReviews', () => {
    it('fetches reviews for prod-1 (seed has 3 reviews)', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useProductReviews('prod-1'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(3);
        expect(result.current.data![0]).toMatchObject({
            id: expect.any(String),
            productId: 'prod-1',
            rating: expect.any(Number),
            createdAt: expect.any(Date),
        });
        queryClient.clear();
    });

    it('returns empty array for a product with no reviews', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useProductReviews('prod-9'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
        queryClient.clear();
    });
});

// ─── useSubmitReview ──────────────────────────────────────────────────────────

describe('useSubmitReview', () => {
    it('posts a new review and returns mapped review', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useSubmitReview('prod-1'), { wrapper: Wrapper });

        let submitted: Awaited<ReturnType<typeof result.current.mutateAsync>>;
        await act(async () => {
            submitted = await result.current.mutateAsync({
                rating: 5,
                title: 'Excellent!',
                body: 'Really good product.',
            });
        });

        expect(submitted!.productId).toBe('prod-1');
        expect(submitted!.rating).toBe(5);
        expect(submitted!.title).toBe('Excellent!');
        queryClient.clear();
    });

    it('invalidates reviews and product queries on success', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderHook(() => useSubmitReview('prod-1'), { wrapper: Wrapper });

        await act(async () => {
            await result.current.mutateAsync({ rating: 4, title: 'Good', body: 'No complaints.' });
        });

        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['product', 'prod-1', 'reviews'] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['product', 'prod-1'] })
        );
        queryClient.clear();
    });
});
