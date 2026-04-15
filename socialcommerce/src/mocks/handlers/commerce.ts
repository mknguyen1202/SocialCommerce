import { http, HttpResponse } from 'msw';
import { PRODUCTS, CATEGORIES, REVIEWS } from '../data/products';
import { ORDERS } from '../data/orders';
import { USERS } from '../data/users';

const u = (id: string) => USERS.find((user) => user.id === id)!;
const now = () => new Date().toISOString();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let products: any[] = [...PRODUCTS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let orders: any[] = [...ORDERS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let reviews: Record<string, any[]> = { ...REVIEWS };

function paginate<T>(items: T[], cursor: string | null, limit: number) {
    const offset = cursor ? parseInt(atob(cursor), 10) : 0;
    const slice = items.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < items.length;
    return { data: slice, next_cursor: hasMore ? btoa(String(nextOffset)) : null, has_more: hasMore };
}

export const commerceHandlers = [
    // ── Products list ─────────────────────────────────────────────────────────

    http.get('*/api/products', ({ request }) => {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') ?? '12', 10);
        const cursor = url.searchParams.get('cursor') ?? null;
        const category = url.searchParams.get('category');
        const q = url.searchParams.get('q')?.toLowerCase();
        const sort = url.searchParams.get('sort') ?? 'newest';
        const minPrice = url.searchParams.get('min_price');
        const maxPrice = url.searchParams.get('max_price');

        let filtered = [...products];

        if (category) {
            filtered = filtered.filter((p) => p.category.slug === category || p.category.id === category);
        }
        if (q) {
            filtered = filtered.filter(
                (p) => p.title.toLowerCase().includes(q) || p.tags.some((t: string) => t.includes(q)),
            );
        }
        if (minPrice) {
            filtered = filtered.filter((p) => p.price.amount >= parseFloat(minPrice));
        }
        if (maxPrice) {
            filtered = filtered.filter((p) => p.price.amount <= parseFloat(maxPrice));
        }

        if (sort === 'price_asc') {
            filtered.sort((a, b) => a.price.amount - b.price.amount);
        } else if (sort === 'price_desc') {
            filtered.sort((a, b) => b.price.amount - a.price.amount);
        } else if (sort === 'rating') {
            filtered.sort((a, b) => b.rating - a.rating);
        } else if (sort === 'best_selling') {
            filtered.sort((a, b) => b.review_count - a.review_count);
        } else {
            // newest
            filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return HttpResponse.json(paginate(filtered, cursor, limit));
    }),

    // ── Single product ────────────────────────────────────────────────────────

    http.get('*/api/products/:id', ({ params }) => {
        const product = products.find((p) => p.id === params.id);
        if (!product) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(product);
    }),

    // ── Related products ──────────────────────────────────────────────────────

    http.get('*/api/products/:productId/related', ({ params }) => {
        const product = products.find((p) => p.id === params.productId);
        if (!product) return HttpResponse.json([]);
        const related = products
            .filter((p) => p.id !== params.productId && p.category.id === product.category.id)
            .slice(0, 4);
        return HttpResponse.json(related);
    }),

    // ── Categories ────────────────────────────────────────────────────────────

    http.get('*/api/categories', () => {
        return HttpResponse.json(CATEGORIES);
    }),

    // ── Reviews ───────────────────────────────────────────────────────────────

    http.get('*/api/products/:productId/reviews', ({ params }) => {
        return HttpResponse.json(reviews[params.productId as string] ?? []);
    }),

    http.post('*/api/products/:productId/reviews', async ({ request, params }) => {
        const body = (await request.json()) as { rating: number; title: string; body: string; images?: string[] };
        const me = u('usr-1');
        const newReview = {
            id: `rev-${Date.now()}`,
            product_id: params.productId as string,
            author_id: me.id,
            author_username: me.username,
            author_display_name: me.display_name,
            author_avatar_url: me.avatar_url,
            rating: body.rating,
            title: body.title,
            body: body.body,
            images: body.images ?? [],
            helpful_count: 0,
            created_at: now(),
        };
        const pid = params.productId as string;
        reviews = { ...reviews, [pid]: [newReview, ...(reviews[pid] ?? [])] };
        // Update aggregate rating
        products = products.map((p) => {
            if (p.id !== pid) return p;
            const allRevs = [newReview, ...(reviews[pid] ?? [])];
            const avg = allRevs.reduce((sum, r) => sum + r.rating, 0) / allRevs.length;
            return { ...p, rating: Math.round(avg * 10) / 10, review_count: allRevs.length };
        });
        return HttpResponse.json(newReview, { status: 201 });
    }),

    http.post('*/api/products/:productId/reviews/:reviewId/helpful', ({ params }) => {
        const pid = params.productId as string;
        reviews = {
            ...reviews,
            [pid]: (reviews[pid] ?? []).map((r) =>
                r.id === params.reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r,
            ),
        };
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Orders ────────────────────────────────────────────────────────────────

    http.get('*/api/orders', () => {
        return HttpResponse.json(orders);
    }),

    http.get('*/api/orders/:id', ({ params }) => {
        const order = orders.find((o) => o.id === params.id);
        if (!order) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(order);
    }),

    http.post('*/api/orders', async ({ request }) => {
        const body = (await request.json()) as typeof orders[0];
        const newOrder = {
            ...body,
            id: `ord-${Date.now()}`,
            status: 'processing',
            placed_at: now(),
            updated_at: now(),
        };
        orders = [newOrder, ...orders];
        return HttpResponse.json(newOrder, { status: 201 });
    }),

    http.patch('*/api/orders/:orderId/cancel', ({ params }) => {
        orders = orders.map((o) =>
            o.id === params.orderId ? { ...o, status: 'cancelled', updated_at: now() } : o,
        );
        const order = orders.find((o) => o.id === params.orderId);
        return HttpResponse.json(order);
    }),
];
