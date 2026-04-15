import { mapPostDTO } from '../useFeed';

// ─── Base DTO fixture ─────────────────────────────────────────────────────────

const BASE_DTO = {
    id: 'post-1',
    author_id: 'usr-1',
    author_username: 'alexj',
    author_display_name: 'Alex Johnson',
    author_avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alexj',
    type: 'text',
    title: 'Hello World',
    body: 'Body text here',
    media_urls: [] as string[],
    upvotes: 10,
    downvotes: 2,
    score: 8,
    user_vote: null as 'up' | 'down' | null,
    comment_count: 3,
    share_count: 1,
    is_saved: false,
    created_at: '2026-04-01T12:00:00Z',
    edited_at: undefined as string | undefined,
} as const;

// ─── Author mapping ───────────────────────────────────────────────────────────

describe('mapPostDTO — author', () => {
    it('maps author_id and author_username to nested author object', () => {
        const post = mapPostDTO({ ...BASE_DTO });
        expect(post.author.id).toBe('usr-1');
        expect(post.author.username).toBe('alexj');
        expect(post.author.displayName).toBe('Alex Johnson');
    });
});

// ─── Group mapping ────────────────────────────────────────────────────────────

describe('mapPostDTO — group', () => {
    it('leaves group undefined when no group fields are present', () => {
        const post = mapPostDTO({ ...BASE_DTO });
        expect(post.group).toBeUndefined();
    });

    it('maps group fields when all group properties are present', () => {
        const post = mapPostDTO({
            ...BASE_DTO,
            group_id: 'grp-1',
            group_name: 'Gear Talk',
            group_slug: 'gear-talk',
            group_avatar_url: 'https://example.com/grp.jpg',
        });
        expect(post.group?.id).toBe('grp-1');
        expect(post.group?.name).toBe('Gear Talk');
        expect(post.group?.slug).toBe('gear-talk');
        expect(post.group?.avatarUrl).toBe('https://example.com/grp.jpg');
    });
});

// ─── Vote mapping ─────────────────────────────────────────────────────────────

describe('mapPostDTO — userVote', () => {
    it('preserves null userVote', () => {
        const post = mapPostDTO({ ...BASE_DTO, user_vote: null });
        expect(post.userVote).toBeNull();
    });

    it('preserves "up" userVote', () => {
        const post = mapPostDTO({ ...BASE_DTO, user_vote: 'up' });
        expect(post.userVote).toBe('up');
    });

    it('preserves "down" userVote', () => {
        const post = mapPostDTO({ ...BASE_DTO, user_vote: 'down' });
        expect(post.userVote).toBe('down');
    });
});

// ─── Date fields ─────────────────────────────────────────────────────────────

describe('mapPostDTO — dates', () => {
    it('coerces created_at string to a Date', () => {
        const post = mapPostDTO({ ...BASE_DTO });
        expect(post.createdAt).toBeInstanceOf(Date);
    });

    it('maps editedAt to a Date when present', () => {
        const post = mapPostDTO({ ...BASE_DTO, edited_at: '2026-04-02T08:00:00Z' });
        expect(post.editedAt).toBeInstanceOf(Date);
    });

    it('leaves editedAt undefined when absent', () => {
        const post = mapPostDTO({ ...BASE_DTO });
        expect(post.editedAt).toBeUndefined();
    });
});

// ─── Score / counts ───────────────────────────────────────────────────────────

describe('mapPostDTO — numeric fields', () => {
    it('copies upvotes, downvotes, score, commentCount, shareCount', () => {
        const post = mapPostDTO({ ...BASE_DTO });
        expect(post.upvotes).toBe(10);
        expect(post.downvotes).toBe(2);
        expect(post.score).toBe(8);
        expect(post.commentCount).toBe(3);
        expect(post.shareCount).toBe(1);
    });
});
