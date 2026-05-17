const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

function series(days: number, base: { impressions: number; clicks: number; conversions: number }) {
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(Date.now() - (days - 1 - i) * 864e5);
        const dateStr = d.toISOString().slice(0, 10);
        const rand = (v: number) => Math.round(v * (0.6 + Math.random() * 0.8));
        return { date: dateStr, impressions: rand(base.impressions), clicks: rand(base.clicks), conversions: rand(base.conversions) };
    });
}

export const CAMPAIGNS = [
    {
        id: 'camp-1', shop_id: 'shop-1', name: 'Headphones Summer Push', status: 'ACTIVE',
        product_ids: ['sprod-1', 'sprod-6'], daily_budget: 25.00, total_budget: 500.00, spent: 218.50,
        impressions: 42800, clicks: 1712, conversions: 82, ctr: 4.0, cpc: 0.13,
        audience_tags: ['audio', 'tech', 'students'], start_date: daysAgo(9).slice(0, 10), end_date: null,
        series: series(9, { impressions: 4755, clicks: 190, conversions: 9 }),
        created_at: daysAgo(10),
    },
    {
        id: 'camp-2', shop_id: 'shop-1', name: 'Storage Sale Q2', status: 'PAUSED',
        product_ids: ['sprod-4'], daily_budget: 15.00, total_budget: 200.00, spent: 92.00,
        impressions: 18600, clicks: 558, conversions: 27, ctr: 3.0, cpc: 0.16,
        audience_tags: ['storage', 'productivity'], start_date: daysAgo(20).slice(0, 10), end_date: null,
        series: series(20, { impressions: 930, clicks: 28, conversions: 1 }),
        created_at: daysAgo(21),
    },
    {
        id: 'camp-3', shop_id: 'shop-1', name: 'Desk Essentials Bundle', status: 'ENDED',
        product_ids: ['sprod-5', 'sprod-7', 'sprod-10'], daily_budget: 20.00, total_budget: 300.00, spent: 300.00,
        impressions: 61000, clicks: 1830, conversions: 95, ctr: 3.0, cpc: 0.16,
        audience_tags: ['desk-setup', 'home-office'], start_date: daysAgo(30).slice(0, 10), end_date: daysAgo(15).slice(0, 10),
        series: series(15, { impressions: 4066, clicks: 122, conversions: 6 }),
        created_at: daysAgo(32),
    },
    {
        id: 'camp-4', shop_id: 'shop-1', name: 'New Arrivals Launch', status: 'DRAFT',
        product_ids: ['sprod-9', 'sprod-10'], daily_budget: 10.00, total_budget: 150.00, spent: 0,
        impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0,
        audience_tags: ['new-products'], start_date: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), end_date: null,
        series: [],
        created_at: daysAgo(1),
    },
];
