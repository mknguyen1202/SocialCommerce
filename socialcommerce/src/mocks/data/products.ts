import { USERS } from './users';

const findUser = (id: string) => USERS.find((u) => u.id === id)!;
const ago = (days: number) => new Date(Date.now() - days * 864e5).toISOString();

// ─── Categories ───────────────────────────────────────────────────────────────

export const CATEGORIES = [
    { id: 'cat-1', name: 'Electronics', slug: 'electronics', parent_id: undefined },
    { id: 'cat-2', name: 'Fashion', slug: 'fashion', parent_id: undefined },
    { id: 'cat-3', name: 'Home & Garden', slug: 'home-garden', parent_id: undefined },
    { id: 'cat-4', name: 'Sports', slug: 'sports', parent_id: undefined },
    { id: 'cat-5', name: 'Beauty', slug: 'beauty', parent_id: undefined },
];

function vendor(userId: string) {
    const usr = findUser(userId);
    return { id: usr.id, name: usr.display_name, slug: usr.username, avatar_url: usr.avatar_url, rating: 4.5 };
}

function money(amount: number, currency = 'USD') {
    return { amount, currency };
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const PRODUCTS = [
    {
        id: 'prod-1',
        vendor_id: 'usr-6',
        vendor: vendor('usr-6'),
        title: 'Wireless Noise-Cancelling Headphones',
        description: 'Premium over-ear headphones with 40-hour battery life, active noise cancellation, and studio-quality sound. Foldable design with carrying case included.',
        price: money(149.99),
        compare_at_price: money(199.99),
        images: [
            { id: 'img-1a', url: 'https://picsum.photos/seed/headphones/600/600', alt: 'Wireless headphones', order: 0 },
            { id: 'img-1b', url: 'https://picsum.photos/seed/headphones2/600/600', alt: 'Headphones case', order: 1 },
        ],
        category: CATEGORIES[0],
        tags: ['audio', 'wireless', 'anc', 'headphones'],
        variants: [
            { id: 'var-1a', label: 'Midnight Black', sku: 'WNC-BLK-001', price: money(149.99), stock: 42, attributes: { color: 'Black' } },
            { id: 'var-1b', label: 'Pearl White', sku: 'WNC-WHT-001', price: money(149.99), stock: 18, attributes: { color: 'White' } },
        ],
        rating: 4.7,
        review_count: 328,
        availability: 'in_stock',
        created_at: ago(30),
    },
    {
        id: 'prod-2',
        vendor_id: 'usr-4',
        vendor: vendor('usr-4'),
        title: 'Minimalist Leather Crossbody Bag',
        description: 'Hand-stitched genuine leather bag with adjustable strap. Fits a 13" laptop, has a hidden zipper pocket and RFID-blocking card slots.',
        price: money(89.00),
        compare_at_price: undefined as ReturnType<typeof money> | undefined,
        images: [
            { id: 'img-2a', url: 'https://picsum.photos/seed/leatherbag/600/600', alt: 'Leather crossbody bag', order: 0 },
            { id: 'img-2b', url: 'https://picsum.photos/seed/leatherbag2/600/600', alt: 'Bag interior', order: 1 },
        ],
        category: CATEGORIES[1],
        tags: ['bag', 'leather', 'minimalist', 'fashion'],
        variants: [
            { id: 'var-2a', label: 'Tan', sku: 'LCB-TAN-001', price: money(89.00), stock: 12, attributes: { color: 'Tan' } },
            { id: 'var-2b', label: 'Black', sku: 'LCB-BLK-001', price: money(89.00), stock: 7, attributes: { color: 'Black' } },
            { id: 'var-2c', label: 'Burgundy', sku: 'LCB-BRG-001', price: money(95.00), stock: 3, attributes: { color: 'Burgundy' } },
        ],
        rating: 4.9,
        review_count: 214,
        availability: 'in_stock',
        created_at: ago(15),
    },
    {
        id: 'prod-3',
        vendor_id: 'usr-6',
        vendor: vendor('usr-6'),
        title: 'Smart Home Hub Pro',
        description: 'Control all your smart home devices from one hub. Supports Z-Wave, Zigbee, and Wi-Fi. Includes voice assistant integration and scene automation.',
        price: money(79.95),
        compare_at_price: money(99.95),
        images: [
            { id: 'img-3a', url: 'https://picsum.photos/seed/smarthub/600/600', alt: 'Smart hub device', order: 0 },
        ],
        category: CATEGORIES[2],
        tags: ['smart home', 'iot', 'automation', 'hub'],
        variants: [
            { id: 'var-3a', label: 'Standard', sku: 'SHH-STD-001', price: money(79.95), stock: 55, attributes: {} },
            { id: 'var-3b', label: 'Pro Bundle (+ 2 sensors)', sku: 'SHH-PRO-001', price: money(114.95), stock: 22, attributes: {} },
        ],
        rating: 4.4,
        review_count: 97,
        availability: 'in_stock',
        created_at: ago(60),
    },
    {
        id: 'prod-4',
        vendor_id: 'usr-4',
        vendor: vendor('usr-4'),
        title: 'Ultralight Trail Running Shoes',
        description: 'Engineered mesh upper with responsive foam midsole. Lugged rubber outsole for grip on all terrain. Only 220g per shoe.',
        price: money(119.00),
        compare_at_price: undefined as ReturnType<typeof money> | undefined,
        images: [
            { id: 'img-4a', url: 'https://picsum.photos/seed/trailshoes/600/600', alt: 'Trail running shoes', order: 0 },
            { id: 'img-4b', url: 'https://picsum.photos/seed/trailshoes2/600/600', alt: 'Shoe sole detail', order: 1 },
        ],
        category: CATEGORIES[3],
        tags: ['running', 'trail', 'shoes', 'lightweight'],
        variants: [
            { id: 'var-4a', label: 'US 8', sku: 'TRS-US8-001', price: money(119.00), stock: 5, attributes: { size: 'US 8' } },
            { id: 'var-4b', label: 'US 9', sku: 'TRS-US9-001', price: money(119.00), stock: 8, attributes: { size: 'US 9' } },
            { id: 'var-4c', label: 'US 10', sku: 'TRS-US10-001', price: money(119.00), stock: 11, attributes: { size: 'US 10' } },
            { id: 'var-4d', label: 'US 11', sku: 'TRS-US11-001', price: money(119.00), stock: 6, attributes: { size: 'US 11' } },
        ],
        rating: 4.6,
        review_count: 182,
        availability: 'in_stock',
        created_at: ago(45),
    },
    {
        id: 'prod-5',
        vendor_id: 'usr-6',
        vendor: vendor('usr-6'),
        title: 'Botanical Skincare Set',
        description: 'Three-step morning routine: vitamin C serum, hydrating moisturiser, and SPF 50 sunscreen. Vegan, fragrance-free, dermatologist-tested.',
        price: money(64.50),
        compare_at_price: money(85.00),
        images: [
            { id: 'img-5a', url: 'https://picsum.photos/seed/skincare/600/600', alt: 'Skincare set', order: 0 },
        ],
        category: CATEGORIES[4],
        tags: ['skincare', 'vegan', 'spf', 'serum'],
        variants: [
            { id: 'var-5a', label: 'Standard Kit', sku: 'BSS-STD-001', price: money(64.50), stock: 30, attributes: {} },
        ],
        rating: 4.8,
        review_count: 411,
        availability: 'in_stock',
        created_at: ago(20),
    },
    {
        id: 'prod-6',
        vendor_id: 'usr-4',
        vendor: vendor('usr-4'),
        title: 'Bamboo Standing Desk Mat',
        description: 'Anti-fatigue mat with natural bamboo top layer and memory foam core. Non-slip base. 90cm × 60cm, 2cm thick.',
        price: money(54.99),
        compare_at_price: undefined as ReturnType<typeof money> | undefined,
        images: [
            { id: 'img-6a', url: 'https://picsum.photos/seed/deskmat/600/600', alt: 'Standing desk mat', order: 0 },
        ],
        category: CATEGORIES[2],
        tags: ['desk', 'ergonomic', 'bamboo', 'standing'],
        variants: [
            { id: 'var-6a', label: 'Natural Bamboo', sku: 'BSD-NAT-001', price: money(54.99), stock: 25, attributes: { finish: 'Natural' } },
            { id: 'var-6b', label: 'Walnut', sku: 'BSD-WAL-001', price: money(59.99), stock: 10, attributes: { finish: 'Walnut' } },
        ],
        rating: 4.3,
        review_count: 58,
        availability: 'in_stock',
        created_at: ago(10),
    },
    {
        id: 'prod-7',
        vendor_id: 'usr-6',
        vendor: vendor('usr-6'),
        title: 'Merino Wool Crew Sweater',
        description: '100% extra-fine merino wool. Temperature-regulating, odour-resistant, machine washable. Classic fit with ribbed cuffs and hem.',
        price: money(98.00),
        compare_at_price: money(120.00),
        images: [
            { id: 'img-7a', url: 'https://picsum.photos/seed/merino/600/600', alt: 'Merino wool sweater', order: 0 },
        ],
        category: CATEGORIES[1],
        tags: ['sweater', 'merino', 'wool', 'fashion'],
        variants: [
            { id: 'var-7a', label: 'XS / Forest Green', sku: 'MWS-XS-GRN', price: money(98.00), stock: 4, attributes: { size: 'XS', color: 'Forest Green' } },
            { id: 'var-7b', label: 'S / Forest Green', sku: 'MWS-S-GRN', price: money(98.00), stock: 8, attributes: { size: 'S', color: 'Forest Green' } },
            { id: 'var-7c', label: 'M / Forest Green', sku: 'MWS-M-GRN', price: money(98.00), stock: 12, attributes: { size: 'M', color: 'Forest Green' } },
            { id: 'var-7d', label: 'M / Oatmeal', sku: 'MWS-M-OAT', price: money(98.00), stock: 9, attributes: { size: 'M', color: 'Oatmeal' } },
        ],
        rating: 4.5,
        review_count: 143,
        availability: 'in_stock',
        created_at: ago(7),
    },
    {
        id: 'prod-8',
        vendor_id: 'usr-4',
        vendor: vendor('usr-4'),
        title: 'Adjustable Dumbbell Set (5–52 lb)',
        description: 'Replaces 15 sets of weights. Dial-select mechanism adjusts in 2.5 lb increments. Includes two dumbbells and storage tray.',
        price: money(299.00),
        compare_at_price: money(349.00),
        images: [
            { id: 'img-8a', url: 'https://picsum.photos/seed/dumbbells/600/600', alt: 'Adjustable dumbbell set', order: 0 },
        ],
        category: CATEGORIES[3],
        tags: ['fitness', 'dumbbells', 'weights', 'home gym'],
        variants: [
            { id: 'var-8a', label: '5–52 lb Pair', sku: 'ADS-52-001', price: money(299.00), stock: 15, attributes: {} },
        ],
        rating: 4.9,
        review_count: 762,
        availability: 'in_stock',
        created_at: ago(90),
    },
    {
        id: 'prod-9',
        vendor_id: 'usr-6',
        vendor: vendor('usr-6'),
        title: 'Portable Espresso Maker',
        description: 'Manual 18-bar pressure espresso maker. Compatible with ground coffee and ESE pods. No batteries or electricity required.',
        price: money(49.95),
        compare_at_price: undefined as ReturnType<typeof money> | undefined,
        images: [
            { id: 'img-9a', url: 'https://picsum.photos/seed/espresso/600/600', alt: 'Portable espresso maker', order: 0 },
        ],
        category: CATEGORIES[2],
        tags: ['coffee', 'espresso', 'portable', 'kitchen'],
        variants: [
            { id: 'var-9a', label: 'Silver', sku: 'PEM-SLV-001', price: money(49.95), stock: 44, attributes: { color: 'Silver' } },
            { id: 'var-9b', label: 'Matte Black', sku: 'PEM-BLK-001', price: money(49.95), stock: 37, attributes: { color: 'Matte Black' } },
        ],
        rating: 4.6,
        review_count: 290,
        availability: 'in_stock',
        created_at: ago(25),
    },
    {
        id: 'prod-10',
        vendor_id: 'usr-4',
        vendor: vendor('usr-4'),
        title: 'Blue Light Blocking Glasses',
        description: 'Anti-reflective blue light filter lenses in a lightweight acetate frame. Available in prescription and non-prescription. Reduces digital eye strain.',
        price: money(39.99),
        compare_at_price: money(59.99),
        images: [
            { id: 'img-10a', url: 'https://picsum.photos/seed/blglasses/600/600', alt: 'Blue light glasses', order: 0 },
        ],
        category: CATEGORIES[0],
        tags: ['glasses', 'blue light', 'eye strain', 'work from home'],
        variants: [
            { id: 'var-10a', label: 'Classic Tortoise', sku: 'BLG-TORT-001', price: money(39.99), stock: 60, attributes: { frame: 'Tortoise' } },
            { id: 'var-10b', label: 'Matte Black', sku: 'BLG-BLK-001', price: money(39.99), stock: 48, attributes: { frame: 'Black' } },
        ],
        rating: 4.2,
        review_count: 519,
        availability: 'in_stock',
        created_at: ago(5),
    },
];

// ─── Reviews ──────────────────────────────────────────────────────────────────

function makeReview(id: string, productId: string, authorId: string, rating: number, title: string, body: string, daysAgo: number) {
    const usr = findUser(authorId);
    return {
        id,
        product_id: productId,
        author_id: usr.id,
        author_username: usr.username,
        author_display_name: usr.display_name,
        author_avatar_url: usr.avatar_url,
        rating,
        title,
        body,
        images: [] as string[],
        helpful_count: Math.floor(Math.random() * 30),
        created_at: ago(daysAgo),
    };
}

export const REVIEWS: Record<string, ReturnType<typeof makeReview>[]> = {
    'prod-1': [
        makeReview('rev-1a', 'prod-1', 'usr-2', 5, 'Best headphones I\'ve owned', 'Sound quality is incredible and the ANC is genuinely impressive. Battery lasts exactly as advertised.', 5),
        makeReview('rev-1b', 'prod-1', 'usr-3', 4, 'Great but a bit heavy', 'Love the sound stage. Slightly heavy after 4+ hours. Overall highly recommended.', 12),
        makeReview('rev-1c', 'prod-1', 'usr-5', 5, 'Perfect for travel', 'Used these on a 12-hour flight. ANC blocked nearly all engine noise. Superb.', 20),
    ],
    'prod-2': [
        makeReview('rev-2a', 'prod-2', 'usr-1', 5, 'Gorgeous craftsmanship', 'The stitching is immaculate. Leather feels premium and the RFID blocking actually works.', 3),
        makeReview('rev-2b', 'prod-2', 'usr-4', 5, 'Perfect everyday bag', 'Fits my 13" MacBook and all my daily essentials. The hidden pocket is a clever touch.', 8),
    ],
    'prod-4': [
        makeReview('rev-4a', 'prod-4', 'usr-2', 4, 'Light and grippy', 'Ran a half marathon in these. Feet felt great at mile 12. Could use a bit more cushioning on roads.', 14),
        makeReview('rev-4b', 'prod-4', 'usr-5', 5, 'Trail destroyers', 'I\'ve put 200 miles on these. Still holding up. Grip is exceptional on wet rocks.', 30),
    ],
    'prod-5': [
        makeReview('rev-5a', 'prod-5', 'usr-3', 5, 'Transformed my morning routine', 'Visible difference in skin tone within 3 weeks. The SPF 50 doesn\'t leave a white cast.', 2),
        makeReview('rev-5b', 'prod-5', 'usr-1', 5, 'Finally a vegan set that works', 'Sensitive skin approved. No breakouts after 6 weeks of use. Reordering immediately.', 9),
    ],
    'prod-8': [
        makeReview('rev-8a', 'prod-8', 'usr-2', 5, 'Game changer for home gym', 'Replaced an entire rack of weights. Dial mechanism is satisfying and reliable.', 45),
        makeReview('rev-8b', 'prod-8', 'usr-3', 5, 'Worth every penny', 'Used these daily for 6 months. Zero issues. Build quality is exceptional.', 60),
    ],
};
