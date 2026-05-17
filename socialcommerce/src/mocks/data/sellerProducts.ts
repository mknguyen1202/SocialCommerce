const ago = (days: number) => new Date(Date.now() - days * 864e5).toISOString();

export const SELLER_PRODUCTS = [
    {
        id: 'sprod-1', shop_id: 'shop-1', title: 'UltraSound Pro Headphones', description: 'Premium wireless ANC headphones with 40hr battery.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp1/400/400', 'https://picsum.photos/seed/sp1b/400/400'],
        variants: [
            { id: 'sv-1a', label: 'Midnight Black', sku: 'USP-BLK-001', price: 149.99, stock: 42, low_stock_threshold: 10, attributes: { color: 'Black' } },
            { id: 'sv-1b', label: 'Pearl White', sku: 'USP-WHT-001', price: 149.99, stock: 3, low_stock_threshold: 10, attributes: { color: 'White' } },
        ],
        status: 'ACTIVE', tags: ['audio', 'wireless', 'anc'], slug: 'ultrasound-pro-headphones',
        seo_title: 'UltraSound Pro Headphones – Premium ANC Audio', seo_description: 'Shop UltraSound Pro headphones with 40hr battery life.',
        sales_last_30d: 28, created_at: ago(60), updated_at: ago(5),
    },
    {
        id: 'sprod-2', shop_id: 'shop-1', title: '4K Streaming Webcam', description: 'Crystal-clear 4K webcam with built-in ring light and AI framing.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp2/400/400'],
        variants: [
            { id: 'sv-2a', label: 'Standard', sku: 'CAM-4K-001', price: 89.99, stock: 20, low_stock_threshold: 5, attributes: {} },
        ],
        status: 'ACTIVE', tags: ['webcam', 'streaming', '4k'], slug: '4k-streaming-webcam',
        seo_title: '4K Streaming Webcam with Ring Light', seo_description: 'Best 4K webcam for streaming.',
        sales_last_30d: 15, created_at: ago(45), updated_at: ago(10),
    },
    {
        id: 'sprod-3', shop_id: 'shop-1', title: 'Mechanical Gaming Keyboard', description: 'TKL mechanical keyboard with Cherry MX Red switches and RGB lighting.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp3/400/400'],
        variants: [
            { id: 'sv-3a', label: 'Red Switch / Black', sku: 'KBD-RED-001', price: 79.99, stock: 8, low_stock_threshold: 10, attributes: { switch: 'Red', color: 'Black' } },
            { id: 'sv-3b', label: 'Blue Switch / White', sku: 'KBD-BLU-001', price: 79.99, stock: 0, low_stock_threshold: 10, attributes: { switch: 'Blue', color: 'White' } },
        ],
        status: 'OUT_OF_STOCK', tags: ['keyboard', 'gaming', 'mechanical'], slug: 'mechanical-gaming-keyboard',
        seo_title: 'TKL Mechanical Keyboard RGB', seo_description: 'TKL mechanical keyboard with Cherry MX switches.',
        sales_last_30d: 6, created_at: ago(90), updated_at: ago(3),
    },
    {
        id: 'sprod-4', shop_id: 'shop-1', title: 'Portable SSD 1TB', description: 'Ultra-fast USB-C portable SSD, 1000MB/s read.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp4/400/400'],
        variants: [
            { id: 'sv-4a', label: '500GB', sku: 'SSD-500-001', price: 59.99, stock: 30, low_stock_threshold: 8, attributes: { size: '500GB' } },
            { id: 'sv-4b', label: '1TB', sku: 'SSD-1TB-001', price: 99.99, stock: 22, low_stock_threshold: 8, attributes: { size: '1TB' } },
            { id: 'sv-4c', label: '2TB', sku: 'SSD-2TB-001', price: 169.99, stock: 2, low_stock_threshold: 8, attributes: { size: '2TB' } },
        ],
        status: 'ACTIVE', tags: ['ssd', 'storage', 'usb-c'], slug: 'portable-ssd-1tb',
        seo_title: 'Portable SSD 1TB – USB-C Fast Storage', seo_description: 'Ultra-fast portable SSD for professionals.',
        sales_last_30d: 19, created_at: ago(70), updated_at: ago(7),
    },
    {
        id: 'sprod-5', shop_id: 'shop-1', title: 'Smart Desk Lamp', description: 'Touch-control LED lamp with wireless charging base and USB-A port.', category: 'Home & Garden', category_id: 'cat-3',
        images: ['https://picsum.photos/seed/sp5/400/400'],
        variants: [
            { id: 'sv-5a', label: 'White', sku: 'LMP-WHT-001', price: 45.00, stock: 55, low_stock_threshold: 10, attributes: { color: 'White' } },
        ],
        status: 'ACTIVE', tags: ['lamp', 'wireless-charging', 'smart'], slug: 'smart-desk-lamp',
        seo_title: 'Smart Desk Lamp with Wireless Charging', seo_description: 'Modern LED desk lamp with wireless charging.',
        sales_last_30d: 32, created_at: ago(55), updated_at: ago(2),
    },
    {
        id: 'sprod-6', shop_id: 'shop-1', title: 'Noise-Cancelling Earbuds', description: 'True-wireless earbuds with hybrid ANC, 8hr battery + 24hr case.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp6/400/400'],
        variants: [
            { id: 'sv-6a', label: 'Black', sku: 'EAR-BLK-001', price: 69.99, stock: 7, low_stock_threshold: 10, attributes: { color: 'Black' } },
            { id: 'sv-6b', label: 'Teal', sku: 'EAR-TEA-001', price: 69.99, stock: 14, low_stock_threshold: 10, attributes: { color: 'Teal' } },
        ],
        status: 'ACTIVE', tags: ['earbuds', 'anc', 'wireless'], slug: 'noise-cancelling-earbuds',
        seo_title: 'Noise-Cancelling True Wireless Earbuds', seo_description: 'Best ANC earbuds under $100.',
        sales_last_30d: 41, created_at: ago(80), updated_at: ago(1),
    },
    {
        id: 'sprod-7', shop_id: 'shop-1', title: 'USB-C Hub 10-in-1', description: '10-in-1 USB-C hub with 4K HDMI, 100W PD, SD card, ethernet.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp7/400/400'],
        variants: [
            { id: 'sv-7a', label: 'Space Gray', sku: 'HUB-10-001', price: 54.99, stock: 38, low_stock_threshold: 10, attributes: { color: 'Space Gray' } },
        ],
        status: 'ACTIVE', tags: ['hub', 'usb-c', 'docking'], slug: 'usb-c-hub-10-in-1',
        seo_title: '10-in-1 USB-C Hub Docking Station', seo_description: 'Ultimate USB-C hub for your laptop.',
        sales_last_30d: 23, created_at: ago(40), updated_at: ago(4),
    },
    {
        id: 'sprod-8', shop_id: 'shop-1', title: 'Gaming Mouse Pro', description: '16K DPI optical sensor, 7 programmable buttons, ultralight 68g.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp8/400/400'],
        variants: [
            { id: 'sv-8a', label: 'Matte Black', sku: 'MSE-BLK-001', price: 64.99, stock: 0, low_stock_threshold: 10, attributes: { color: 'Black' } },
        ],
        status: 'OUT_OF_STOCK', tags: ['mouse', 'gaming', '16k-dpi'], slug: 'gaming-mouse-pro',
        seo_title: 'Pro Gaming Mouse 16K DPI', seo_description: 'Ultralight gaming mouse for competitive play.',
        sales_last_30d: 0, created_at: ago(120), updated_at: ago(15),
    },
    {
        id: 'sprod-9', shop_id: 'shop-1', title: 'Cable Organizer Kit', description: '24-piece cable management set with velcro straps, clips, and box.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp9/400/400'],
        variants: [
            { id: 'sv-9a', label: 'Black Kit', sku: 'CBL-KIT-001', price: 19.99, stock: 100, low_stock_threshold: 20, attributes: {} },
        ],
        status: 'DRAFT', tags: ['cables', 'organizer', 'desk'], slug: 'cable-organizer-kit',
        seo_title: 'Cable Management Kit 24-Piece', seo_description: 'Keep your desk tidy with this cable management kit.',
        sales_last_30d: 0, created_at: ago(5), updated_at: ago(1),
    },
    {
        id: 'sprod-10', shop_id: 'shop-1', title: 'Wireless Charging Pad', description: '15W fast wireless charging for Qi-compatible devices.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp10/400/400'],
        variants: [
            { id: 'sv-10a', label: 'Black', sku: 'CHG-PAD-001', price: 29.99, stock: 65, low_stock_threshold: 15, attributes: { color: 'Black' } },
            { id: 'sv-10b', label: 'White', sku: 'CHG-PAD-002', price: 29.99, stock: 40, low_stock_threshold: 15, attributes: { color: 'White' } },
        ],
        status: 'ACTIVE', tags: ['wireless-charging', 'qi', 'fast-charge'], slug: 'wireless-charging-pad',
        seo_title: 'Fast 15W Wireless Charging Pad', seo_description: 'Universal Qi wireless charger for phones.',
        sales_last_30d: 38, created_at: ago(35), updated_at: ago(3),
    },
    {
        id: 'sprod-11', shop_id: 'shop-1', title: 'Vintage Polaroid Camera', description: 'Retro instant film camera. Includes first pack of film.', category: 'Electronics', category_id: 'cat-1',
        images: ['https://picsum.photos/seed/sp11/400/400'],
        variants: [
            { id: 'sv-11a', label: 'Cream', sku: 'POL-CRM-001', price: 79.99, stock: 12, low_stock_threshold: 5, attributes: { color: 'Cream' } },
            { id: 'sv-11b', label: 'Cobalt Blue', sku: 'POL-BLU-001', price: 79.99, stock: 4, low_stock_threshold: 5, attributes: { color: 'Cobalt Blue' } },
        ],
        status: 'ACTIVE', tags: ['camera', 'instant', 'retro'], slug: 'vintage-polaroid-camera',
        seo_title: 'Retro Instant Polaroid Camera', seo_description: 'Instant film camera with vintage style.',
        sales_last_30d: 9, created_at: ago(100), updated_at: ago(20),
    },
    {
        id: 'sprod-12', shop_id: 'shop-1', title: 'Desk Air Purifier', description: 'Compact HEPA air purifier for desks up to 200 sq ft.', category: 'Home & Garden', category_id: 'cat-3',
        images: ['https://picsum.photos/seed/sp12/400/400'],
        variants: [
            { id: 'sv-12a', label: 'White', sku: 'AIR-WHT-001', price: 59.99, stock: 0, low_stock_threshold: 8, attributes: { color: 'White' } },
        ],
        status: 'ARCHIVED', tags: ['air-purifier', 'hepa', 'desk'], slug: 'desk-air-purifier',
        seo_title: 'Desktop HEPA Air Purifier', seo_description: 'Compact air purifier for your home office.',
        sales_last_30d: 0, created_at: ago(200), updated_at: ago(50),
    },
];
