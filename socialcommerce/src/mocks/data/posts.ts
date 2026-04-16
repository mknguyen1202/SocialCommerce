import { USERS } from './users';

const u = (id: string) => USERS.find((user) => user.id === id)!;
const ago = (days: number, hours = 0) =>
    new Date(Date.now() - days * 864e5 - hours * 3600e3).toISOString();

// ─── Groups (referenced in post data) ────────────────────────────────────────

export const GROUP_SLUGS = {
    devTalk: 'dev-talk',
    fitnessHub: 'fitness-hub',
    homeChefs: 'home-chefs',
    designSystems: 'design-systems',
    indieHackers: 'indie-hackers',
    trailRunning: 'trail-running',
};

// ─── Posts ────────────────────────────────────────────────────────────────────

function post(
    id: string,
    authorId: string,
    type: string,
    title: string,
    body: string,
    extra: Partial<{
        group_id: string;
        group_name: string;
        group_slug: string;
        group_avatar_url: string;
        media_urls: string[];
        link_url: string;
        upvotes: number;
        downvotes: number;
        score: number;
        comment_count: number;
        share_count: number;
        is_saved: boolean;
        created_at: string;
        user_vote: 'up' | 'down' | null;
    }> = {},
) {
    const usr = u(authorId);
    return {
        id,
        author_user_id: usr.id,
        author_username: usr.username,
        author_display_name: usr.display_name,
        author_avatar_url: usr.avatar_url,
        type,
        title,
        body,
        media_urls: extra.media_urls ?? [],
        link_url: extra.link_url,
        group_id: extra.group_id,
        group_name: extra.group_name,
        group_slug: extra.group_slug,
        group_avatar_url: extra.group_avatar_url,
        upvotes: extra.upvotes ?? Math.floor(Math.random() * 200) + 5,
        downvotes: extra.downvotes ?? Math.floor(Math.random() * 20),
        score: extra.score ?? Math.floor(Math.random() * 180) + 5,
        user_vote: extra.user_vote ?? null,
        comment_count: extra.comment_count ?? Math.floor(Math.random() * 50),
        share_count: extra.share_count ?? Math.floor(Math.random() * 20),
        is_saved: extra.is_saved ?? false,
        created_at: extra.created_at ?? ago(Math.floor(Math.random() * 7), Math.floor(Math.random() * 24)),
        edited_at: undefined as string | undefined,
    };
}

export const POSTS = [
    post('post-1', 'usr-2', 'text',
        'Why TypeScript strict mode is non-negotiable in 2026',
        'After three years of maintaining large codebases, I can confidently say that turning on `strict: true` has saved us hundreds of hours of debugging. Here\'s a breakdown of the features that pay for themselves...',
        {
            group_id: 'grp-1', group_name: 'Dev Talk', group_slug: GROUP_SLUGS.devTalk,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=devtalk',
            upvotes: 318, downvotes: 12, score: 306, comment_count: 42, share_count: 31,
            created_at: ago(1),
        }),
    post('post-2', 'usr-3', 'image',
        'Progress update: 6 months of consistent training',
        'Started with bodyweight only. Now hitting PRs I never thought possible. The adjustable dumbbells from Luna Boutique have been a game changer.',
        {
            media_urls: ['https://picsum.photos/seed/fitness-progress/800/600'],
            group_id: 'grp-2', group_name: 'Fitness Hub', group_slug: GROUP_SLUGS.fitnessHub,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=fitnesshub',
            upvotes: 204, downvotes: 3, score: 201, comment_count: 28,
            created_at: ago(0, 14),
        }),
    post('post-3', 'usr-4', 'text',
        'Slow-cooked lamb shoulder — 8-hour recipe that actually works',
        'Moroccan-inspired, no oven required. Everything in a cast iron pot. The secret is the preserved lemon at the start, not the end. Full recipe in the comments.',
        {
            group_id: 'grp-3', group_name: 'Home Chefs', group_slug: GROUP_SLUGS.homeChefs,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=homechefs',
            upvotes: 156, downvotes: 2, score: 154, comment_count: 36,
            created_at: ago(2),
        }),
    post('post-4', 'usr-5', 'link',
        'A new JS runtime just beat Node.js on every benchmark',
        'Article from The Register. The numbers are surprising — even on I/O-heavy workloads.',
        {
            link_url: 'https://example.com/article/js-runtime-benchmark',
            group_id: 'grp-1', group_name: 'Dev Talk', group_slug: GROUP_SLUGS.devTalk,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=devtalk',
            upvotes: 89, downvotes: 7, score: 82, comment_count: 15,
            created_at: ago(3),
        }),
    post('post-5', 'usr-1', 'text',
        'Tried 5 different standing desk mats — here\'s my honest ranking',
        'After developing back pain from long coding sessions I tested five mats over three months. TL;DR: bamboo + memory foam hybrid wins by a mile.',
        {
            upvotes: 267, downvotes: 8, score: 259, comment_count: 53, share_count: 44,
            is_saved: true,
            created_at: ago(4),
        }),
    post('post-6', 'usr-2', 'image',
        'My home coffee setup after way too much research',
        'Espresso grinder, tamper, and the portable maker I take hiking. Total overkill, zero regrets.',
        {
            media_urls: [
                'https://picsum.photos/seed/coffee-setup/800/600',
                'https://picsum.photos/seed/coffee-grinder/800/600',
            ],
            upvotes: 112, downvotes: 1, score: 111, comment_count: 22,
            created_at: ago(0, 6),
        }),
    post('post-7', 'usr-3', 'text',
        'React 20 concurrent features every developer should know',
        'Server components changed how I think about data fetching. Suspense boundaries are now effortless. Here\'s what I\'ve learned after migrating two large apps.',
        {
            group_id: 'grp-1', group_name: 'Dev Talk', group_slug: GROUP_SLUGS.devTalk,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=devtalk',
            upvotes: 445, downvotes: 18, score: 427, comment_count: 71,
            created_at: ago(5),
        }),
    post('post-8', 'usr-4', 'image',
        'Weekend hike in the Cascades — stunning trail conditions',
        'First time running trails at altitude. The trail shoes handled every surface perfectly. 22km, 1,400m elevation gain.',
        {
            media_urls: [
                'https://picsum.photos/seed/hike-summit/800/600',
                'https://picsum.photos/seed/hike-trail/800/600',
            ],
            group_id: 'grp-2', group_name: 'Fitness Hub', group_slug: GROUP_SLUGS.fitnessHub,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=fitnesshub',
            upvotes: 178, downvotes: 2, score: 176, comment_count: 19,
            created_at: ago(6),
        }),
    post('post-9', 'usr-5', 'text',
        'PSA: Stop using environment variables for secrets in containers',
        'I see this everywhere. `docker run -e DB_PASSWORD=...` is not secure. Use Docker secrets or a vault. Here\'s how to migrate in 15 minutes.',
        {
            group_id: 'grp-1', group_name: 'Dev Talk', group_slug: GROUP_SLUGS.devTalk,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=devtalk',
            upvotes: 592, downvotes: 4, score: 588, comment_count: 64,
            created_at: ago(7),
        }),
    post('post-10', 'usr-6', 'text',
        'New arrivals this week — spring merino collection',
        'Just restocked the merino crew sweaters in three new colors. Early review from @sarahmk: "Softest sweater I\'ve ever worn." Limited sizes, first come first served.',
        {
            upvotes: 93, downvotes: 1, score: 92, comment_count: 11,
            created_at: ago(0, 3),
        }),

    // ── Design Systems ────────────────────────────────────────────────────────

    post('post-11', 'usr-2', 'text',
        'Neomorphism in dark themes: the shadow math that actually works',
        'The key insight most tutorials miss: both shadows must use the same base color. A light shadow is `rgba(255,255,255,0.06)` and a dark shadow is `rgba(0,0,0,0.55)`. Anything more than 6% opacity on the light side looks like a glow, not a surface.',
        {
            group_id: 'grp-4', group_name: 'Design Systems', group_slug: GROUP_SLUGS.designSystems,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=designsystems',
            upvotes: 381, downvotes: 9, score: 372, comment_count: 47, share_count: 62,
            created_at: ago(0, 2),
        }),
    post('post-12', 'usr-4', 'image',
        'Token architecture for a 6-product design system',
        'We support light, dark, high-contrast, and brand-override themes simultaneously. Here\'s the three-tier token structure (primitive → semantic → component) that lets us do it without going insane.',
        {
            media_urls: ['https://picsum.photos/seed/token-diagram/1200/600'],
            group_id: 'grp-4', group_name: 'Design Systems', group_slug: GROUP_SLUGS.designSystems,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=designsystems',
            upvotes: 512, downvotes: 4, score: 508, comment_count: 63, share_count: 88,
            created_at: ago(1),
        }),
    post('post-13', 'usr-1', 'link',
        'Radix UI just released fully unstyled primitives for every component',
        'No more fighting default styles. The primitive layer is now officially separate from the themed layer. This changes how I think about building accessible components.',
        {
            link_url: 'https://radix-ui.com/primitives',
            group_id: 'grp-4', group_name: 'Design Systems', group_slug: GROUP_SLUGS.designSystems,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=designsystems',
            upvotes: 247, downvotes: 6, score: 241, comment_count: 29,
            created_at: ago(2),
        }),
    post('post-14', 'usr-3', 'text',
        'CSS custom properties vs. TypeScript tokens: where do you draw the line?',
        'Our current approach: TS constants generate the CSS variables at build time. Runtime theming stays in CSS, compile-time type safety stays in TS. The tradeoff is a two-step mental model. Curious how others handle this.',
        {
            group_id: 'grp-4', group_name: 'Design Systems', group_slug: GROUP_SLUGS.designSystems,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=designsystems',
            upvotes: 193, downvotes: 11, score: 182, comment_count: 38,
            created_at: ago(3),
        }),

    // ── Indie Hackers ─────────────────────────────────────────────────────────

    post('post-15', 'usr-5', 'text',
        '$0 → $4,200 MRR in 7 months: what worked, what didn\'t',
        'I built a niche invoicing tool for freelance translators. No viral moments, no Product Hunt launch spike that held. Just consistent SEO and one well-placed Reddit comment that sent 600 signups in a week.',
        {
            group_id: 'grp-5', group_name: 'Indie Hackers', group_slug: GROUP_SLUGS.indieHackers,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=indiehackers',
            upvotes: 734, downvotes: 5, score: 729, comment_count: 91, share_count: 103,
            created_at: ago(0, 10),
        }),
    post('post-16', 'usr-2', 'text',
        'I killed a product at $800 MRR. Here\'s the honest post-mortem.',
        'Churn was 18% monthly. I was spending 40 hours a week on support for customers who weren\'t getting value. The unit economics didn\'t work and I was burning out. Shutting down was the right call.',
        {
            group_id: 'grp-5', group_name: 'Indie Hackers', group_slug: GROUP_SLUGS.indieHackers,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=indiehackers',
            upvotes: 892, downvotes: 2, score: 890, comment_count: 114, share_count: 140,
            created_at: ago(4),
        }),
    post('post-17', 'usr-1', 'link',
        'Why most SaaS analytics dashboards are lying to their founders',
        'Activation rate calculated on trial users means nothing if your trial is frictionless. The article makes a compelling case for measuring activation on paying cohorts only.',
        {
            link_url: 'https://example.com/article/saas-metrics-lie',
            group_id: 'grp-5', group_name: 'Indie Hackers', group_slug: GROUP_SLUGS.indieHackers,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=indiehackers',
            upvotes: 388, downvotes: 14, score: 374, comment_count: 55,
            created_at: ago(6),
        }),

    // ── Trail Running ─────────────────────────────────────────────────────────

    post('post-18', 'usr-4', 'image',
        'Race report: Cascade 50K — 2,800m elevation, 6h 14min',
        'Fourth ultra, first sub-6:30 at elevation. Nutrition timing was the difference — 200 kcal every 35 min instead of every hour. Photos from aid station 3 and the summit ridge.',
        {
            media_urls: [
                'https://picsum.photos/seed/ultra-summit/800/600',
                'https://picsum.photos/seed/ultra-aid/800/600',
                'https://picsum.photos/seed/ultra-finish/800/600',
            ],
            group_id: 'grp-6', group_name: 'Trail Running', group_slug: GROUP_SLUGS.trailRunning,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=trailrunning',
            upvotes: 423, downvotes: 1, score: 422, comment_count: 57, share_count: 38,
            created_at: ago(0, 18),
        }),
    post('post-19', 'usr-3', 'text',
        'Strava segment obsession is killing my easy runs. Anyone else?',
        'I deleted Strava from my phone during easy days. Week one was uncomfortable. Week two my HR zones actually matched the plan for the first time in a year. It\'s a real problem.',
        {
            group_id: 'grp-6', group_name: 'Trail Running', group_slug: GROUP_SLUGS.trailRunning,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=trailrunning',
            upvotes: 317, downvotes: 22, score: 295, comment_count: 44,
            created_at: ago(2),
        }),
    post('post-20', 'usr-5', 'link',
        'New study: trail running reduces cortisol more than road running at equal effort',
        'Sample size is small (n=62) but the difference is statistically significant. Hypothesized cause: visual engagement with uneven terrain activates parasympathetic response.',
        {
            link_url: 'https://example.com/article/trail-cortisol-study',
            group_id: 'grp-6', group_name: 'Trail Running', group_slug: GROUP_SLUGS.trailRunning,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=trailrunning',
            upvotes: 204, downvotes: 8, score: 196, comment_count: 31,
            created_at: ago(5),
        }),

    // ── Cross-community / wall posts (authored by usr-1 / Alex) ──────────────

    post('post-21', 'usr-1', 'text',
        'Six months of neomorphic UI in production — user feedback summary',
        'We shipped a full neomorphic redesign in October. Here\'s what 800 user sessions and 120 support tickets taught us: shadow depth perception is highly monitor-brightness-dependent. Users on uncalibrated displays saw flat UI where we intended raised. The fix: always provide a hover state that communicates affordance beyond shadows alone.',
        {
            group_id: 'grp-4', group_name: 'Design Systems', group_slug: GROUP_SLUGS.designSystems,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=designsystems',
            upvotes: 619, downvotes: 7, score: 612, comment_count: 73, share_count: 91,
            is_saved: true,
            created_at: ago(0, 1),
        }),
    post('post-22', 'usr-1', 'image',
        'Morning run — first sunrise of spring',
        'Five kilometers, empty streets, good thoughts. Sometimes that\'s all you need.',
        {
            media_urls: ['https://picsum.photos/seed/sunrise-run/800/600'],
            upvotes: 388, downvotes: 0, score: 388, comment_count: 34,
            created_at: ago(0, 5),
        }),
    post('post-23', 'usr-1', 'text',
        'Ask me anything: building a social + commerce platform from scratch',
        'Two years in. TypeScript, React, MSW for mocking, Zustand for state. Happy to answer questions about architecture decisions, what I\'d do differently, or anything else.',
        {
            upvotes: 541, downvotes: 3, score: 538, comment_count: 88, share_count: 56,
            created_at: ago(3),
        }),
    post('post-24', 'usr-2', 'image',
        'Before and after: neomorphic card redesign',
        'Left is flat material. Right is the neumorphic version. Same information, very different tactile feel. Dark theme with a single base color — no additional background colors on any element.',
        {
            media_urls: [
                'https://picsum.photos/seed/card-before/800/500',
                'https://picsum.photos/seed/card-after/800/500',
            ],
            group_id: 'grp-4', group_name: 'Design Systems', group_slug: GROUP_SLUGS.designSystems,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=designsystems',
            upvotes: 477, downvotes: 6, score: 471, comment_count: 52, share_count: 74,
            created_at: ago(1),
        }),
    post('post-25', 'usr-4', 'text',
        'Sourdough starter reboot after 3 months in the fridge',
        'Fed it twice daily for 4 days. Smell is back, rise is consistent. Recipe for the revival process in comments — it\'s easier than most guides make it sound.',
        {
            group_id: 'grp-3', group_name: 'Home Chefs', group_slug: GROUP_SLUGS.homeChefs,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=homechefs',
            upvotes: 271, downvotes: 3, score: 268, comment_count: 41,
            created_at: ago(1),
        }),
    post('post-26', 'usr-6', 'image',
        'New: woven texture totes — zero plastic, ships this week',
        'Hand-woven natural cotton, ethically sourced. Available in four colorways. Every purchase plants a tree. Ships from our Portland warehouse.',
        {
            media_urls: [
                'https://picsum.photos/seed/tote-natural/800/800',
                'https://picsum.photos/seed/tote-color/800/800',
            ],
            upvotes: 184, downvotes: 2, score: 182, comment_count: 26,
            created_at: ago(0, 7),
        }),
    post('post-27', 'usr-3', 'text',
        'The case for boring technology in 2026',
        'Postgres. Redis. Node. S3. No Kafka, no service mesh, no distributed tracing pipeline on day one. Boring tech lets you focus on the product. You can always add complexity — you can rarely remove it.',
        {
            group_id: 'grp-1', group_name: 'Dev Talk', group_slug: GROUP_SLUGS.devTalk,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=devtalk',
            upvotes: 1024, downvotes: 38, score: 986, comment_count: 132, share_count: 119,
            created_at: ago(8),
        }),
    post('post-28', 'usr-5', 'text',
        'Weighted pull-up progression: adding 40kg in 12 weeks',
        'Progressive overload is simple but the tracking matters. Spreadsheet template in comments. Key lesson: lower the rep count before you add weight, not after.',
        {
            group_id: 'grp-2', group_name: 'Fitness Hub', group_slug: GROUP_SLUGS.fitnessHub,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=fitnesshub',
            upvotes: 349, downvotes: 4, score: 345, comment_count: 49,
            created_at: ago(3),
        }),
    post('post-29', 'usr-2', 'link',
        'Accessibility audit of 50 popular design systems — the results are grim',
        'Only 9 of 50 passed all critical WCAG 2.2 AA checks out of the box. Focus management and color contrast are the most common failures.',
        {
            link_url: 'https://example.com/article/a11y-design-system-audit',
            group_id: 'grp-4', group_name: 'Design Systems', group_slug: GROUP_SLUGS.designSystems,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=designsystems',
            upvotes: 567, downvotes: 2, score: 565, comment_count: 61, share_count: 84,
            created_at: ago(7),
        }),
    post('post-30', 'usr-1', 'text',
        'My indie app hit $10K MRR — here\'s the unexpected thing that got us there',
        'It wasn\'t SEO, it wasn\'t cold outreach. It was a single YouTube video by a creator I\'ve never spoken to. They found the product, made a tutorial, and sent 1,200 paying users. Community content you don\'t control is your most powerful distribution channel.',
        {
            group_id: 'grp-5', group_name: 'Indie Hackers', group_slug: GROUP_SLUGS.indieHackers,
            group_avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=indiehackers',
            upvotes: 1182, downvotes: 6, score: 1176, comment_count: 148, share_count: 201,
            is_saved: true,
            created_at: ago(2),
        }),
];

// ─── Comments (per post) ──────────────────────────────────────────────────────

function comment(
    id: string,
    postId: string,
    authorId: string,
    body: string,
    daysAgo: number,
    extra: Partial<{ upvotes: number; score: number; parent_id: string; replies: unknown[] }> = {},
) {
    const usr = u(authorId);
    return {
        id,
        post_id: postId,
        parent_id: extra.parent_id,
        author_id: usr.id,
        author_username: usr.username,
        author_display_name: usr.display_name,
        author_avatar_url: usr.avatar_url,
        body,
        upvotes: extra.upvotes ?? Math.floor(Math.random() * 50) + 1,
        downvotes: 0,
        score: extra.score ?? Math.floor(Math.random() * 50) + 1,
        user_vote: null as 'up' | 'down' | null,
        replies: extra.replies ?? [],
        reply_count: (extra.replies ?? []).length,
        created_at: ago(daysAgo),
        edited_at: undefined as string | undefined,
    };
}

export const COMMENTS: Record<string, ReturnType<typeof comment>[]> = {
    'post-1': [
        comment('cmt-1a', 'post-1', 'usr-3', 'Cannot agree more. `noUncheckedIndexedAccess` alone has caught so many bugs.', 0, { upvotes: 45, score: 45 }),
        comment('cmt-1b', 'post-1', 'usr-5', 'I fought strict mode for years. Finally gave in and the DX improvement is real.', 0, { upvotes: 38, score: 38 }),
        comment('cmt-1c', 'post-1', 'usr-4', 'What\'s your take on `exactOptionalPropertyTypes`? We find it breaks too many third-party types.', 1, { upvotes: 22, score: 22 }),
    ],
    'post-2': [
        comment('cmt-2a', 'post-2', 'usr-2', 'This is incredible progress. Consistency really is everything.', 0, { upvotes: 67, score: 67 }),
        comment('cmt-2b', 'post-2', 'usr-4', 'Those dumbbell sets are genuinely worth the investment. Still going strong on mine.', 0, { upvotes: 29, score: 29 }),
    ],
    'post-7': [
        comment('cmt-7a', 'post-7', 'usr-1', 'The mental model shift from "server fetches then passes to client" to "components render where they live" took me a while but now it\'s so natural.', 2, { upvotes: 88, score: 88 }),
        comment('cmt-7b', 'post-7', 'usr-5', 'The `use` hook is still experimental IIRC — any issues with it in production?', 2, { upvotes: 34, score: 34 }),
    ],
    'post-11': [
        comment('cmt-11a', 'post-11', 'usr-1', 'This is the post I\'ve been waiting for. Every neomorphism tutorial skips the math and goes straight to the Figma file.', 0, { upvotes: 112, score: 112 }),
        comment('cmt-11b', 'post-11', 'usr-4', 'We found 0.04–0.06 opacity on the light shadow and 0.45–0.55 on the dark shadow is the sweet spot for dark OLED displays specifically.', 0, { upvotes: 78, score: 78 }),
        comment('cmt-11c', 'post-11', 'usr-3', 'What do you do for accessibility? High contrast mode needs to override the shadows entirely.', 0, { upvotes: 54, score: 54 }),
        comment('cmt-11d', 'post-11', 'usr-2', 'Replying to the a11y question: we use a `@media (prefers-contrast: more)` override that swaps inset shadows for a 2px solid border. Works well.', 0, { upvotes: 41, score: 41 }),
        comment('cmt-11e', 'post-11', 'usr-5', 'The "inset for active state" principle is something I had to discover through failure. Spent a week wondering why buttons felt wrong.', 1, { upvotes: 33, score: 33 }),
    ],
    'post-12': [
        comment('cmt-12a', 'post-12', 'usr-2', 'The diagram finally makes the three-tier model click for me. Do you generate from Style Dictionary or a custom script?', 0, { upvotes: 89, score: 89 }),
        comment('cmt-12b', 'post-12', 'usr-1', 'Style Dictionary with a custom transformer for CSS variables + a TS barrel file. Happy to share the config.', 0, { upvotes: 67, score: 67 }),
        comment('cmt-12c', 'post-12', 'usr-5', 'How do you handle per-component overrides without blowing up the token namespace?', 0, { upvotes: 44, score: 44 }),
        comment('cmt-12d', 'post-12', 'usr-4', 'Component tokens only exist when there\'s genuine reuse. Otherwise we reference semantic tokens directly. Resist the urge to abstract everything.', 0, { upvotes: 58, score: 58 }),
    ],
    'post-15': [
        comment('cmt-15a', 'post-15', 'usr-1', 'The Reddit comment detail is wild. Which subreddit?', 0, { upvotes: 134, score: 134 }),
        comment('cmt-15b', 'post-15', 'usr-5', 'r/freelance. I answered a frustration thread honestly — not a pitch, just "I built this because I had the same problem." 600 signups from one post.', 0, { upvotes: 98, score: 98 }),
        comment('cmt-15c', 'post-15', 'usr-3', 'Customer acquisition via genuine community participation > every paid channel I\'ve tried.', 0, { upvotes: 77, score: 77 }),
        comment('cmt-15d', 'post-15', 'usr-4', 'What\'s your churn looking like?', 0, { upvotes: 45, score: 45 }),
        comment('cmt-15e', 'post-15', 'usr-5', 'About 4.5% monthly. Still working on onboarding to get it lower.', 0, { upvotes: 39, score: 39 }),
    ],
    'post-16': [
        comment('cmt-16a', 'post-16', 'usr-1', 'Respect for posting this. The "build in public" community needs more honest failure stories and fewer hockey stick screenshots.', 0, { upvotes: 201, score: 201 }),
        comment('cmt-16b', 'post-16', 'usr-4', '18% monthly churn means your median customer lifetime is under 6 months. That\'s a product-market fit problem, not a retention tactics problem.', 0, { upvotes: 156, score: 156 }),
        comment('cmt-16c', 'post-16', 'usr-3', 'Did you talk to churned customers? What did they say?', 0, { upvotes: 88, score: 88 }),
        comment('cmt-16d', 'post-16', 'usr-2', 'Most common response: "I just stopped needing it." The problem I was solving was real but episodic, not recurring.', 0, { upvotes: 72, score: 72 }),
    ],
    'post-18': [
        comment('cmt-18a', 'post-18', 'usr-2', 'That summit photo is stunning. What\'s your drop bag strategy for 50Ks?', 0, { upvotes: 91, score: 91 }),
        comment('cmt-18b', 'post-18', 'usr-4', 'One bag at the midpoint, soft flasks + poles between. I don\'t use crew support — I find it stresses me out more than it helps.', 0, { upvotes: 64, score: 64 }),
        comment('cmt-18c', 'post-18', 'usr-3', 'The 200 kcal / 35 min tip is gold. I was bonking at 35km every race and it was definitely underfueling.', 0, { upvotes: 78, score: 78 }),
        comment('cmt-18d', 'post-18', 'usr-1', 'What shoes were you in?', 0, { upvotes: 41, score: 41 }),
        comment('cmt-18e', 'post-18', 'usr-4', 'Hoka Speedgoat 6. Great for technical terrain at that distance.', 0, { upvotes: 37, score: 37 }),
    ],
    'post-21': [
        comment('cmt-21a', 'post-21', 'usr-3', 'The monitor brightness issue is real and underreported. We ran the same tests and dark mode neomorphism just doesn\'t work on the MacBook Air default brightness (70%).', 0, { upvotes: 143, score: 143 }),
        comment('cmt-21b', 'post-21', 'usr-4', 'How did you solve the hover state problem? Text color change feels too subtle for non-interactive surfaces.', 0, { upvotes: 97, score: 97 }),
        comment('cmt-21c', 'post-21', 'usr-1', 'We added a very subtle background tint on hover — `rgba(255,255,255,0.03)`. Combined with a slight shadow increase it reads as elevation change without being distracting.', 0, { upvotes: 84, score: 84 }),
        comment('cmt-21d', 'post-21', 'usr-2', 'Did you consider falling back to flat design when `prefers-color-scheme: dark` is combined with low contrast preferences?', 0, { upvotes: 66, score: 66 }),
        comment('cmt-21e', 'post-21', 'usr-5', 'The talk about production neomorphism is rare. Thank you for the real data.', 0, { upvotes: 52, score: 52 }),
    ],
    'post-23': [
        comment('cmt-23a', 'post-23', 'usr-3', 'How did you handle optimistic updates across the social and commerce domains without a unified state layer?', 0, { upvotes: 88, score: 88 }),
        comment('cmt-23b', 'post-23', 'usr-1', 'React Query\'s `onMutate` / `onError` pair for optimistic + rollback. Each domain has its own QueryClient context so there\'s no cross-contamination.', 0, { upvotes: 72, score: 72 }),
        comment('cmt-23c', 'post-23', 'usr-4', 'MSW for mocking — any pain points at scale?', 0, { upvotes: 54, score: 54 }),
        comment('cmt-23d', 'post-23', 'usr-1', 'Naming patterns in handlers drift over time. We now enforce a strict `*/api/<resource>/<id>/<action>` URL structure and it\'s much easier to maintain.', 0, { upvotes: 48, score: 48 }),
        comment('cmt-23e', 'post-23', 'usr-2', 'What would you do differently on the auth layer?', 0, { upvotes: 39, score: 39 }),
        comment('cmt-23f', 'post-23', 'usr-5', 'Zustand for UI state + React Query for server state is such a solid combo. No Redux regrets?', 0, { upvotes: 61, score: 61 }),
    ],
    'post-27': [
        comment('cmt-27a', 'post-27', 'usr-1', 'Saved this post. Showed it to two engineers who wanted to add Kafka to a project we haven\'t launched yet.', 0, { upvotes: 234, score: 234 }),
        comment('cmt-27b', 'post-27', 'usr-4', 'The part about "you can always add complexity" is the thing every senior engineer knows and every junior engineer has to learn the hard way.', 0, { upvotes: 189, score: 189 }),
        comment('cmt-27c', 'post-27', 'usr-2', 'Counterpoint: if your boring stack becomes a bottleneck at 10x scale you\'ve incurred migration debt that\'s very expensive. Sometimes thinking ahead is cheaper.', 0, { upvotes: 144, score: 144 }),
        comment('cmt-27d', 'post-27', 'usr-3', 'The key word in your counterpoint is "sometimes." The problem is engineers optimize for 10x scale on day zero when they\'re at 0.1x scale.', 0, { upvotes: 121, score: 121 }),
    ],
    'post-30': [
        comment('cmt-30a', 'post-30', 'usr-2', 'This is the most important distribution lesson I\'ve read this year. You can\'t plan for it but you can make it possible by having a great product.', 0, { upvotes: 287, score: 287 }),
        comment('cmt-30b', 'post-30', 'usr-4', 'What was the video title? Trying to understand what angle they took.', 0, { upvotes: 198, score: 198 }),
        comment('cmt-30c', 'post-30', 'usr-1', '"I replaced 3 tools with this one app" — very practical, no hype. That framing is what made it land.', 0, { upvotes: 164, score: 164 }),
        comment('cmt-30d', 'post-30', 'usr-3', 'Did you reach out to them afterward?', 0, { upvotes: 112, score: 112 }),
        comment('cmt-30e', 'post-30', 'usr-1', 'Yes — offered them a free account upgrade. They turned it down. "I don\'t want to be an affiliate, I just liked the product." Still the best thing anyone has ever said about something I built.', 0, { upvotes: 341, score: 341 }),
    ],
};
