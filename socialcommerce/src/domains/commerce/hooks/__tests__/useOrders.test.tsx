import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../mocks/server';
import { createWrapper } from '../../../../test/renderWithProviders';
import {
    useOrders,
    useOrder,
    usePlaceOrder,
    useCancelOrder,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_COLORS,
} from '../useOrders';
import { ORDERS } from '../../../../mocks/data/orders';

// ─── ORDER_STATUS_LABELS / ORDER_STATUS_COLORS ────────────────────────────────

describe('ORDER_STATUS_LABELS', () => {
    it('has human-readable labels for every status', () => {
        expect(ORDER_STATUS_LABELS).toMatchObject({
            pending: expect.any(String),
            confirmed: expect.any(String),
            shipped: expect.any(String),
            delivered: expect.any(String),
            cancelled: expect.any(String),
            refunded: expect.any(String),
        });
        // Sanity: none of the labels is an empty string
        Object.values(ORDER_STATUS_LABELS).forEach((label) => {
            expect(label.length).toBeGreaterThan(0);
        });
    });
});

describe('ORDER_STATUS_COLORS', () => {
    it('has a CSS value for every status', () => {
        expect(ORDER_STATUS_COLORS).toMatchObject({
            pending: expect.any(String),
            confirmed: expect.any(String),
            shipped: expect.any(String),
            delivered: expect.any(String),
            cancelled: expect.any(String),
            refunded: expect.any(String),
        });
    });
});

// ─── useOrders ────────────────────────────────────────────────────────────────

describe('useOrders', () => {
    it('fetches the full orders list', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useOrders(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(ORDERS.length);
        queryClient.clear();
    });

    it('maps domain shape correctly', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useOrders(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const order = result.current.data![0];
        expect(order).toMatchObject({
            id: expect.any(String),
            status: expect.any(String),
            total: expect.objectContaining({ amount: expect.any(Number), currency: 'USD' }),
            placedAt: expect.any(Date),
            updatedAt: expect.any(Date),
        });
        queryClient.clear();
    });

    it('is in error state on 500', async () => {
        server.use(
            http.get('*/api/orders', () => new HttpResponse(null, { status: 500 }))
        );
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useOrders(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ─── useOrder (single) ────────────────────────────────────────────────────────

describe('useOrder', () => {
    it('fetches a single order by id', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useOrder('ord-1'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data!.id).toBe('ord-1');
        expect(result.current.data!.status).toBe('delivered');
        queryClient.clear();
    });

    it('is disabled when id is empty string', () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useOrder(''), { wrapper: Wrapper });

        expect(result.current.isPending).toBe(true);
        expect(result.current.isFetchedAfterMount).toBe(false);
    });

    it('is in error state on 404', async () => {
        server.use(
            http.get('*/api/orders/:id', () => new HttpResponse(null, { status: 404 }))
        );
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useOrder('ord-not-found'), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ─── usePlaceOrder ────────────────────────────────────────────────────────────

describe('usePlaceOrder', () => {
    it('posts a new order and returns the mapped order', async () => {
        // Override the handler to return a complete, parseable order DTO
        server.use(
            http.post('*/api/orders', () =>
                HttpResponse.json(
                    {
                        ...ORDERS[0],
                        id: `ord-${Date.now()}`,
                        status: 'pending',
                    },
                    { status: 201 }
                )
            )
        );

        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => usePlaceOrder(), { wrapper: Wrapper });

        let placed: Awaited<ReturnType<typeof result.current.mutateAsync>>;
        await act(async () => {
            placed = await result.current.mutateAsync({
                items: [{ productId: 'prod-1', variantId: 'var-1a', quantity: 1 }],
                shippingAddress: {
                    fullName: 'Alex Johnson',
                    line1: '742 Evergreen Terrace',
                    city: 'Springfield',
                    state: 'OR',
                    postalCode: '97401',
                    country: 'US',
                },
                paymentMethodId: 'pm-1',
            });
        });

        expect(placed!.id).toMatch(/^ord-/);
        expect(placed!.status).toBe('pending');
        queryClient.clear();
    });

    it('invalidates the orders list on success', async () => {
        server.use(
            http.post('*/api/orders', () =>
                HttpResponse.json({ ...ORDERS[0], id: 'ord-test', status: 'pending' }, { status: 201 })
            )
        );

        const { Wrapper, queryClient } = createWrapper();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderHook(() => usePlaceOrder(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.mutateAsync({
                items: [{ productId: 'prod-1', variantId: 'var-1a', quantity: 1 }],
                shippingAddress: {
                    fullName: 'Alex Johnson',
                    line1: '742 Evergreen Terrace',
                    city: 'Springfield',
                    state: 'OR',
                    postalCode: '97401',
                    country: 'US',
                },
                paymentMethodId: 'pm-1',
            });
        });

        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['orders'] })
        );
        queryClient.clear();
    });
});

// ─── useCancelOrder ───────────────────────────────────────────────────────────

describe('useCancelOrder', () => {
    it('patches order status to cancelled', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const { result } = renderHook(() => useCancelOrder(), { wrapper: Wrapper });

        let cancelled: Awaited<ReturnType<typeof result.current.mutateAsync>>;
        await act(async () => {
            cancelled = await result.current.mutateAsync('ord-2');
        });

        expect(cancelled!.id).toBe('ord-2');
        expect(cancelled!.status).toBe('cancelled');
        queryClient.clear();
    });

    it('invalidates both the individual order and the orders list', async () => {
        const { Wrapper, queryClient } = createWrapper();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderHook(() => useCancelOrder(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.mutateAsync('ord-2');
        });

        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['order', 'ord-2'] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ['orders'] })
        );
        queryClient.clear();
    });
});
