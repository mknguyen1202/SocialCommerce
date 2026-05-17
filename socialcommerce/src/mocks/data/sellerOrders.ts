import { USERS } from './users';

const u = (id: string) => USERS.find((user) => user.id === id)!;

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

function makeOrder(
    id: string, shopId: string, num: string, custId: string,
    items: Array<{ productId: string; title: string; variantLabel: string; sku: string; qty: number; unitPrice: number; img: string }>,
    status: string, daysAgoPlaced: number, trackingNum: string | null = null, refundedAt: string | null = null
) {
    const cu = u(custId);
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const shippingCost = subtotal >= 50 ? 0 : 5.99;
    const now = new Date().toISOString();
    const placedAt = daysAgo(daysAgoPlaced);

    const history: Array<{ status: string; at: string; note?: string }> = [
        { status: 'PENDING', at: placedAt },
    ];
    if (['CONFIRMED', 'SHIPPED', 'DELIVERED', 'REFUNDED'].includes(status)) {
        history.push({ status: 'CONFIRMED', at: daysAgo(daysAgoPlaced - 0.2) });
    }
    if (['SHIPPED', 'DELIVERED', 'REFUNDED'].includes(status)) {
        history.push({ status: 'SHIPPED', at: daysAgo(daysAgoPlaced - 1.5), note: trackingNum ? `Tracking: ${trackingNum}` : undefined });
    }
    if (['DELIVERED'].includes(status)) {
        history.push({ status: 'DELIVERED', at: daysAgo(daysAgoPlaced - 4) });
    }
    if (status === 'REFUNDED') {
        history.push({ status: 'REFUNDED', at: refundedAt ?? now });
    }
    if (status === 'CANCELLED') {
        history.push({ status: 'CANCELLED', at: daysAgo(daysAgoPlaced - 0.1) });
    }

    const refundEligibleUntil = daysAgoPlaced < 30
        ? new Date(new Date(placedAt).getTime() + 30 * 864e5).toISOString()
        : null;

    return {
        id,
        shop_id: shopId,
        order_number: num,
        customer_id: custId,
        customer_name: cu.display_name,
        customer_email: `${cu.username}@example.com`,
        customer_avatar_url: cu.avatar_url,
        items: items.map(i => ({
            product_id: i.productId,
            product_title: i.title,
            variant_label: i.variantLabel,
            sku: i.sku,
            quantity: i.qty,
            unit_price: i.unitPrice,
            image_url: i.img,
        })),
        subtotal,
        shipping_cost: shippingCost,
        total: subtotal + shippingCost,
        currency: 'USD',
        status,
        tracking_number: trackingNum,
        shipping_address: { line1: '123 Main St', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' },
        customer_note: null,
        status_history: history,
        refund_eligible_until: refundEligibleUntil,
        refunded_at: refundedAt,
        placed_at: placedAt,
        updated_at: now,
    };
}

export const SELLER_ORDERS = [
    makeOrder('sord-1', 'shop-1', 'ORD-1001', 'usr-2',
        [{ productId: 'sprod-1', title: 'UltraSound Pro Headphones', variantLabel: 'Midnight Black', sku: 'USP-BLK-001', qty: 1, unitPrice: 149.99, img: 'https://picsum.photos/seed/sp1/400/400' }],
        'DELIVERED', 20, 'TRK-ABC123'),

    makeOrder('sord-2', 'shop-1', 'ORD-1002', 'usr-3',
        [{ productId: 'sprod-5', title: 'Smart Desk Lamp', variantLabel: 'White', sku: 'LMP-WHT-001', qty: 2, unitPrice: 45.00, img: 'https://picsum.photos/seed/sp5/400/400' }],
        'SHIPPED', 3, 'TRK-DEF456'),

    makeOrder('sord-3', 'shop-1', 'ORD-1003', 'usr-4',
        [
            { productId: 'sprod-4', title: 'Portable SSD', variantLabel: '1TB', sku: 'SSD-1TB-001', qty: 1, unitPrice: 99.99, img: 'https://picsum.photos/seed/sp4/400/400' },
            { productId: 'sprod-7', title: 'USB-C Hub 10-in-1', variantLabel: 'Space Gray', sku: 'HUB-10-001', qty: 1, unitPrice: 54.99, img: 'https://picsum.photos/seed/sp7/400/400' },
        ],
        'CONFIRMED', 1),

    makeOrder('sord-4', 'shop-1', 'ORD-1004', 'usr-5',
        [{ productId: 'sprod-10', title: 'Wireless Charging Pad', variantLabel: 'Black', sku: 'CHG-PAD-001', qty: 1, unitPrice: 29.99, img: 'https://picsum.photos/seed/sp10/400/400' }],
        'PENDING', 0.1),

    makeOrder('sord-5', 'shop-1', 'ORD-1005', 'usr-6',
        [{ productId: 'sprod-6', title: 'Noise-Cancelling Earbuds', variantLabel: 'Black', sku: 'EAR-BLK-001', qty: 1, unitPrice: 69.99, img: 'https://picsum.photos/seed/sp6/400/400' }],
        'REFUNDED', 25, 'TRK-GHI789', daysAgo(5)),

    makeOrder('sord-6', 'shop-1', 'ORD-1006', 'usr-2',
        [{ productId: 'sprod-2', title: '4K Streaming Webcam', variantLabel: 'Standard', sku: 'CAM-4K-001', qty: 1, unitPrice: 89.99, img: 'https://picsum.photos/seed/sp2/400/400' }],
        'DELIVERED', 35, 'TRK-JKL012'),

    makeOrder('sord-7', 'shop-1', 'ORD-1007', 'usr-3',
        [{ productId: 'sprod-1', title: 'UltraSound Pro Headphones', variantLabel: 'Pearl White', sku: 'USP-WHT-001', qty: 1, unitPrice: 149.99, img: 'https://picsum.photos/seed/sp1/400/400' }],
        'DELIVERED', 40, 'TRK-MNO345'),

    makeOrder('sord-8', 'shop-1', 'ORD-1008', 'usr-4',
        [{ productId: 'sprod-5', title: 'Smart Desk Lamp', variantLabel: 'White', sku: 'LMP-WHT-001', qty: 1, unitPrice: 45.00, img: 'https://picsum.photos/seed/sp5/400/400' }],
        'CANCELLED', 15),

    makeOrder('sord-9', 'shop-1', 'ORD-1009', 'usr-5',
        [
            { productId: 'sprod-11', title: 'Vintage Polaroid Camera', variantLabel: 'Cream', sku: 'POL-CRM-001', qty: 1, unitPrice: 79.99, img: 'https://picsum.photos/seed/sp11/400/400' },
            { productId: 'sprod-10', title: 'Wireless Charging Pad', variantLabel: 'White', sku: 'CHG-PAD-002', qty: 1, unitPrice: 29.99, img: 'https://picsum.photos/seed/sp10/400/400' },
        ],
        'SHIPPED', 5, 'TRK-PQR678'),

    makeOrder('sord-10', 'shop-1', 'ORD-1010', 'usr-6',
        [{ productId: 'sprod-7', title: 'USB-C Hub 10-in-1', variantLabel: 'Space Gray', sku: 'HUB-10-001', qty: 2, unitPrice: 54.99, img: 'https://picsum.photos/seed/sp7/400/400' }],
        'CONFIRMED', 2),
];
