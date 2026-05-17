import { http, HttpResponse } from 'msw';
import { SHOPS, SHOP_MEMBERS, SHOP_INVITES } from '../data/shops';
import { SELLER_PRODUCTS } from '../data/sellerProducts';
import { SELLER_ORDERS } from '../data/sellerOrders';
import { CAMPAIGNS } from '../data/campaigns';
import { SHOP_CONVERSATIONS, SHOP_CANNED_REPLIES } from '../data/shopConversations';
import { USERS } from '../data/users';

const u = (id: string) => USERS.find((user) => user.id === id)!;
const now = () => new Date().toISOString();

// Mutable clones
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let shops: any[] = [...SHOPS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let members: any[] = [...SHOP_MEMBERS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let invites: any[] = [...SHOP_INVITES];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sellerProducts: any[] = [...SELLER_PRODUCTS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sellerOrders: any[] = [...SELLER_ORDERS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let campaigns: any[] = [...CAMPAIGNS];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let shopConversations: any[] = SHOP_CONVERSATIONS.map(c => ({ ...c }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let shopMessages: Record<string, any[]> = Object.fromEntries(
    SHOP_CONVERSATIONS.map(c => [c.id, [...c.messages]])
);

// ─── Analytics helper ─────────────────────────────────────────────────────────

function buildAnalytics(shopId: string, rangeDays: number) {
    const orders = sellerOrders.filter(o => o.shop_id === shopId && o.status !== 'CANCELLED');
    const series = Array.from({ length: rangeDays }, (_, i) => {
        const d = new Date(Date.now() - (rangeDays - 1 - i) * 864e5);
        const dateStr = d.toISOString().slice(0, 10);
        const dayOrders = orders.filter(o => o.placed_at.slice(0, 10) === dateStr);
        const revenue = dayOrders.reduce((s: number, o: typeof sellerOrders[0]) => s + o.total, 0);
        const unitsSold = dayOrders.reduce((s: number, o: typeof sellerOrders[0]) =>
            s + o.items.reduce((ss: number, it: typeof sellerOrders[0]['items'][0]) => ss + it.quantity, 0), 0);
        // Simulate view/cart counts for funnel
        return {
            date: dateStr,
            revenue: parseFloat(revenue.toFixed(2)),
            orders: dayOrders.length,
            units_sold: unitsSold,
            views: Math.round(dayOrders.length * 12 + Math.random() * 20),
            cart_adds: Math.round(dayOrders.length * 3 + Math.random() * 5),
        };
    });

    const totalRevenue = series.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = series.reduce((s, d) => s + d.orders, 0);
    const totalUnits = series.reduce((s, d) => s + d.units_sold, 0);
    const totalViews = series.reduce((s, d) => s + d.views, 0);
    const totalCartAdds = series.reduce((s, d) => s + d.cart_adds, 0);

    const productRevMap: Record<string, { revenue: number; units: number; orders: number }> = {};
    orders.forEach(o => {
        o.items.forEach((it: typeof sellerOrders[0]['items'][0]) => {
            if (!productRevMap[it.product_id]) productRevMap[it.product_id] = { revenue: 0, units: 0, orders: 0 };
            productRevMap[it.product_id].revenue += it.unit_price * it.quantity;
            productRevMap[it.product_id].units += it.quantity;
            productRevMap[it.product_id].orders += 1;
        });
    });

    const topProducts = Object.entries(productRevMap)
        .map(([pid, data]) => {
            const prod = sellerProducts.find(p => p.id === pid);
            return {
                product_id: pid,
                title: prod?.title ?? 'Unknown',
                image_url: prod?.images?.[0] ?? '',
                revenue: parseFloat(data.revenue.toFixed(2)),
                units_sold: data.units,
                orders: data.orders,
            };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    const catRevMap: Record<string, number> = {};
    orders.forEach(o => {
        o.items.forEach((it: typeof sellerOrders[0]['items'][0]) => {
            const prod = sellerProducts.find(p => p.id === it.product_id);
            const cat = prod?.category ?? 'Other';
            catRevMap[cat] = (catRevMap[cat] ?? 0) + it.unit_price * it.quantity;
        });
    });

    const statusCount: Record<string, number> = { PENDING: 0, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0, REFUNDED: 0 };
    sellerOrders.filter(o => o.shop_id === shopId).forEach(o => { statusCount[o.status] = (statusCount[o.status] ?? 0) + 1; });

    return {
        range_days: rangeDays,
        kpis: {
            total_revenue: parseFloat(totalRevenue.toFixed(2)),
            total_orders: totalOrders,
            total_units_sold: totalUnits,
            avg_order_value: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
            conversion_rate: totalViews > 0 ? parseFloat(((totalOrders / totalViews) * 100).toFixed(1)) : 0,
            revenue_change: 12.4,
            orders_change: 8.1,
        },
        series: series.map(d => ({ date: d.date, revenue: d.revenue, orders: d.orders, units_sold: d.units_sold })),
        top_products: topProducts,
        revenue_by_category: Object.entries(catRevMap).map(([cat, rev]) => ({ category: cat, revenue: parseFloat(rev.toFixed(2)) })),
        orders_by_status: Object.entries(statusCount).map(([status, count]) => ({ status, count })),
        conversion_funnel: [
            { stage: 'Views', count: totalViews + totalOrders * 12 },
            { stage: 'Cart adds', count: totalCartAdds + totalOrders * 2 },
            { stage: 'Checkout', count: totalOrders + Math.floor(totalOrders * 0.3) },
            { stage: 'Paid', count: totalOrders },
        ],
    };
}

export const sellerHandlers = [

    // ── Shops ─────────────────────────────────────────────────────────────────

    http.get('*/api/seller/shops', () => {
        return HttpResponse.json(shops.filter(s => members.some(m => m.user_id === 'usr-1' && m.shop_id === s.id)));
    }),

    http.post('*/api/seller/shops', async ({ request }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        const newShop = {
            id: `shop-${Date.now()}`,
            slug: body.slug ?? `shop-${Date.now()}`,
            name: body.name ?? 'New Shop',
            description: body.description ?? '',
            logo_url: null,
            banner_url: null,
            rating: 0,
            review_count: 0,
            product_count: 0,
            follower_count: 0,
            return_policy: '',
            shipping_policy: '',
            privacy_policy: '',
            notify_new_order: true,
            notify_new_message: true,
            notify_low_stock: true,
            owner_id: 'usr-1',
            created_at: now(),
        };
        shops = [newShop, ...shops];
        members = [...members, {
            user_id: 'usr-1', shop_id: newShop.id, role: 'owner',
            permissions: { inventory: true, orders: true, analytics: true, conversations: true, ads: true, settings: true, staff: true },
            display_name: u('usr-1').display_name, email: 'alex.johnson@example.com',
            avatar_url: u('usr-1').avatar_url, last_active: now(), joined_at: now(),
        }];
        return HttpResponse.json(newShop, { status: 201 });
    }),

    http.get('*/api/seller/shops/:shopId', ({ params }) => {
        const shop = shops.find(s => s.id === params.shopId);
        if (!shop) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(shop);
    }),

    http.patch('*/api/seller/shops/:shopId', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        shops = shops.map(s => s.id === params.shopId ? { ...s, ...body } : s);
        return HttpResponse.json(shops.find(s => s.id === params.shopId));
    }),

    http.get('*/api/seller/shops/:shopId/slug-check', ({ request }) => {
        const url = new URL(request.url);
        const slug = url.searchParams.get('slug') ?? '';
        const taken = shops.some(s => s.slug === slug);
        return HttpResponse.json({ available: !taken });
    }),

    // ── Apply to become vendor ─────────────────────────────────────────────────

    http.post('*/api/seller/apply', () => {
        return HttpResponse.json({ success: true, role_granted: 'vendor' }, { status: 200 });
    }),

    // ── Members ───────────────────────────────────────────────────────────────

    http.get('*/api/seller/shops/:shopId/members', ({ params }) => {
        return HttpResponse.json(members.filter(m => m.shop_id === params.shopId));
    }),

    http.patch('*/api/seller/shops/:shopId/members/:userId', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        members = members.map(m => m.shop_id === params.shopId && m.user_id === params.userId ? { ...m, ...body } : m);
        return HttpResponse.json(members.find(m => m.shop_id === params.shopId && m.user_id === params.userId));
    }),

    http.delete('*/api/seller/shops/:shopId/members/:userId', ({ params }) => {
        members = members.filter(m => !(m.shop_id === params.shopId && m.user_id === params.userId));
        return new HttpResponse(null, { status: 204 });
    }),

    http.get('*/api/seller/shops/:shopId/invites', ({ params }) => {
        return HttpResponse.json(invites.filter(i => i.shop_id === params.shopId));
    }),

    http.post('*/api/seller/shops/:shopId/invites', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        const newInvite = {
            id: `inv-${Date.now()}`, shop_id: params.shopId,
            email: body.email, role: body.role, permissions: body.permissions,
            invited_by: 'usr-1',
            created_at: now(),
            expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
        };
        invites = [newInvite, ...invites];
        return HttpResponse.json(newInvite, { status: 201 });
    }),

    http.delete('*/api/seller/shops/:shopId/invites/:inviteId', ({ params }) => {
        invites = invites.filter(i => i.id !== params.inviteId);
        return new HttpResponse(null, { status: 204 });
    }),

    // ── Products ──────────────────────────────────────────────────────────────

    http.get('*/api/seller/shops/:shopId/products', ({ request, params }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get('q')?.toLowerCase();
        const status = url.searchParams.get('status');
        const category = url.searchParams.get('category');
        const lowStock = url.searchParams.get('low_stock') === 'true';

        let filtered = sellerProducts.filter(p => p.shop_id === params.shopId);
        if (q) filtered = filtered.filter(p => p.title.toLowerCase().includes(q));
        if (status) filtered = filtered.filter(p => p.status === status);
        if (category) filtered = filtered.filter(p => p.category_id === category);
        if (lowStock) filtered = filtered.filter(p =>
            p.variants.some((v: { stock: number; low_stock_threshold: number }) => v.stock <= v.low_stock_threshold)
        );
        return HttpResponse.json(filtered);
    }),

    http.get('*/api/seller/shops/:shopId/products/:productId', ({ params }) => {
        const p = sellerProducts.find(p => p.id === params.productId && p.shop_id === params.shopId);
        if (!p) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(p);
    }),

    http.post('*/api/seller/shops/:shopId/products', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        const newProduct = { id: `sprod-${Date.now()}`, shop_id: params.shopId, sales_last_30d: 0, created_at: now(), updated_at: now(), ...body };
        sellerProducts = [newProduct, ...sellerProducts];
        return HttpResponse.json(newProduct, { status: 201 });
    }),

    http.patch('*/api/seller/shops/:shopId/products/:productId', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        sellerProducts = sellerProducts.map(p => p.id === params.productId ? { ...p, ...body, updated_at: now() } : p);
        return HttpResponse.json(sellerProducts.find(p => p.id === params.productId));
    }),

    http.delete('*/api/seller/shops/:shopId/products/:productId', ({ params }) => {
        sellerProducts = sellerProducts.filter(p => p.id !== params.productId);
        return new HttpResponse(null, { status: 204 });
    }),

    http.post('*/api/seller/shops/:shopId/products/bulk', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as { products: any[] };
        const created = body.products.map(p => ({ id: `sprod-${Date.now()}-${Math.random()}`, shop_id: params.shopId, sales_last_30d: 0, created_at: now(), updated_at: now(), ...p }));
        sellerProducts = [...sellerProducts, ...created];
        return HttpResponse.json({ imported: created.length, errors: [] }, { status: 201 });
    }),

    // ── Orders ────────────────────────────────────────────────────────────────

    http.get('*/api/seller/shops/:shopId/orders', ({ request, params }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        let filtered = sellerOrders.filter(o => o.shop_id === params.shopId);
        if (status) filtered = filtered.filter(o => o.status === status);
        filtered.sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime());
        return HttpResponse.json(filtered);
    }),

    http.get('*/api/seller/shops/:shopId/orders/:orderId', ({ params }) => {
        const order = sellerOrders.find(o => o.id === params.orderId && o.shop_id === params.shopId);
        if (!order) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(order);
    }),

    http.post('*/api/seller/shops/:shopId/orders/:orderId/transition', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        const { status, tracking_number } = body;
        sellerOrders = sellerOrders.map(o => {
            if (o.id !== params.orderId) return o;
            const newHistory = [...o.status_history, { status, at: now(), note: tracking_number ? `Tracking: ${tracking_number}` : undefined }];
            return { ...o, status, tracking_number: tracking_number ?? o.tracking_number, status_history: newHistory, updated_at: now() };
        });
        return HttpResponse.json(sellerOrders.find(o => o.id === params.orderId));
    }),

    http.post('*/api/seller/shops/:shopId/orders/:orderId/refund', ({ params }) => {
        const order = sellerOrders.find(o => o.id === params.orderId);
        if (!order) return new HttpResponse(null, { status: 404 });
        if (!order.refund_eligible_until || new Date(order.refund_eligible_until) < new Date()) {
            return HttpResponse.json({ error: 'Refund window expired' }, { status: 422 });
        }
        sellerOrders = sellerOrders.map(o => {
            if (o.id !== params.orderId) return o;
            const newHistory = [...o.status_history, { status: 'REFUNDED', at: now() }];
            return { ...o, status: 'REFUNDED', refunded_at: now(), status_history: newHistory, updated_at: now() };
        });
        return HttpResponse.json(sellerOrders.find(o => o.id === params.orderId));
    }),

    // ── Analytics ─────────────────────────────────────────────────────────────

    http.get('*/api/seller/shops/:shopId/analytics', ({ request, params }) => {
        const url = new URL(request.url);
        const range = url.searchParams.get('range') ?? '30d';
        const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
        return HttpResponse.json(buildAnalytics(params.shopId as string, days));
    }),

    // ── Campaigns ─────────────────────────────────────────────────────────────

    http.get('*/api/seller/shops/:shopId/campaigns', ({ params }) => {
        return HttpResponse.json(campaigns.filter(c => c.shop_id === params.shopId));
    }),

    http.get('*/api/seller/shops/:shopId/campaigns/:campaignId', ({ params }) => {
        const c = campaigns.find(c => c.id === params.campaignId);
        if (!c) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(c);
    }),

    http.post('*/api/seller/shops/:shopId/campaigns', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        const newCamp = {
            id: `camp-${Date.now()}`, shop_id: params.shopId,
            impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, spent: 0,
            series: [], created_at: now(), ...body,
        };
        campaigns = [newCamp, ...campaigns];
        return HttpResponse.json(newCamp, { status: 201 });
    }),

    http.patch('*/api/seller/shops/:shopId/campaigns/:campaignId', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        campaigns = campaigns.map(c => c.id === params.campaignId ? { ...c, ...body } : c);
        return HttpResponse.json(campaigns.find(c => c.id === params.campaignId));
    }),

    http.post('*/api/seller/shops/:shopId/campaigns/:campaignId/pause', ({ params }) => {
        campaigns = campaigns.map(c => c.id === params.campaignId ? { ...c, status: 'PAUSED' } : c);
        return HttpResponse.json(campaigns.find(c => c.id === params.campaignId));
    }),

    http.post('*/api/seller/shops/:shopId/campaigns/:campaignId/resume', ({ params }) => {
        campaigns = campaigns.map(c => c.id === params.campaignId ? { ...c, status: 'ACTIVE' } : c);
        return HttpResponse.json(campaigns.find(c => c.id === params.campaignId));
    }),

    // ── Shop Conversations ────────────────────────────────────────────────────

    http.get('*/api/seller/shops/:shopId/conversations', ({ request, params }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const assignee = url.searchParams.get('assignee');
        let filtered = shopConversations.filter(c => c.shop_id === params.shopId);
        if (status && status !== 'ALL') filtered = filtered.filter(c => c.status === status);
        if (assignee === 'me') filtered = filtered.filter(c => c.assignee_id === 'usr-1');
        if (assignee === 'unassigned') filtered = filtered.filter(c => !c.assignee_id);
        filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return HttpResponse.json(filtered.map(c => ({ ...c, messages: undefined })));
    }),

    http.post('*/api/seller/shops/:shopId/conversations', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        const newConv = {
            id: `sconv-${Date.now()}`, shop_id: params.shopId,
            customer_id: body.customer_id ?? 'usr-1',
            customer_name: 'Customer', customer_avatar_url: '', customer_email: '',
            subject: body.subject ?? 'New conversation',
            status: 'OPEN', assignee_id: null, assignee_name: null,
            linked_order_id: body.linked_order_id ?? null,
            linked_order_number: body.linked_order_number ?? null,
            tags: [], unread_by_staff: 0,
            last_message: null,
            created_at: now(), updated_at: now(),
        };
        shopConversations = [newConv, ...shopConversations];
        shopMessages[newConv.id] = [];
        return HttpResponse.json(newConv, { status: 201 });
    }),

    http.patch('*/api/seller/shops/:shopId/conversations/:convId', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        shopConversations = shopConversations.map(c => c.id === params.convId ? { ...c, ...body, updated_at: now() } : c);
        return HttpResponse.json(shopConversations.find(c => c.id === params.convId));
    }),

    http.get('*/api/seller/shops/:shopId/conversations/:convId/messages', ({ params }) => {
        const msgs = shopMessages[params.convId as string] ?? [];
        // Mark as read
        shopConversations = shopConversations.map(c => c.id === params.convId ? { ...c, unread_by_staff: 0 } : c);
        return HttpResponse.json(msgs);
    }),

    http.post('*/api/seller/shops/:shopId/conversations/:convId/messages', async ({ request, params }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await request.json() as any;
        const sender = u('usr-1');
        const newMsg = {
            id: `msg-${Date.now()}`,
            conversation_id: params.convId,
            sender_id: sender.id,
            sender_name: sender.display_name,
            sender_avatar_url: sender.avatar_url,
            sender_is_customer: false,
            content: body.content,
            is_internal_note: body.is_internal_note ?? false,
            created_at: now(),
        };
        const convId = params.convId as string;
        shopMessages[convId] = [...(shopMessages[convId] ?? []), newMsg];
        shopConversations = shopConversations.map(c => c.id === convId ? {
            ...c, updated_at: now(),
            last_message: { content: newMsg.content, sender_is_customer: false, at: now() },
        } : c);
        return HttpResponse.json(newMsg, { status: 201 });
    }),

    http.get('*/api/seller/shops/:shopId/canned-replies', ({ params }) => {
        return HttpResponse.json(SHOP_CANNED_REPLIES.filter(r => r.shop_id === params.shopId));
    }),

    // ── Image upload stub ─────────────────────────────────────────────────────

    http.post('*/api/seller/upload', async () => {
        return HttpResponse.json({ url: `https://picsum.photos/seed/upload-${Date.now()}/400/400` });
    }),

    // ── Public shop page ──────────────────────────────────────────────────────

    http.get('*/api/shops/:slug', ({ params }) => {
        const shop = shops.find(s => s.slug === params.slug);
        if (!shop) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(shop);
    }),

    http.get('*/api/shops/:slug/products', ({ params }) => {
        const shop = shops.find(s => s.slug === params.slug);
        if (!shop) return HttpResponse.json([]);
        return HttpResponse.json(sellerProducts.filter(p => p.shop_id === shop.id && p.status === 'ACTIVE'));
    }),
];
