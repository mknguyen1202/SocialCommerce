import { USERS } from './users';

const u = (id: string) => USERS.find((user) => user.id === id)!;
const ago = (days: number, hours = 0, minutes = 0) =>
    new Date(Date.now() - days * 864e5 - hours * 3600e3 - minutes * 60e3).toISOString();

// ─── Conversations ────────────────────────────────────────────────────────────

export const CONVERSATIONS = [
    {
        id: 'conv-1',
        type: 'dm' as const,
        name: undefined as string | undefined,
        avatar_url: undefined as string | undefined,
        participant_ids: ['usr-1', 'usr-2'],
        last_message: {
            id: 'msg-1-10',
            content: 'Let me know what you think once you\'ve had a chance to read it!',
            sender_id: 'usr-2',
            sender_display_name: u('usr-2').display_name,
            sender_avatar_url: u('usr-2').avatar_url,
            created_at: ago(0, 2),
        },
        unread_count: 2,
        created_at: ago(30),
    },
    {
        id: 'conv-2',
        type: 'room' as const,
        name: 'Dev Team Sprint Planning',
        avatar_url: 'https://api.dicebear.com/7.x/identicon/svg?seed=devteam',
        participant_ids: ['usr-1', 'usr-2', 'usr-3', 'usr-5'],
        last_message: {
            id: 'msg-2-8',
            content: 'We should move the auth refactor to next sprint.',
            sender_id: 'usr-3',
            sender_display_name: u('usr-3').display_name,
            sender_avatar_url: u('usr-3').avatar_url,
            created_at: ago(0, 5),
        },
        unread_count: 5,
        created_at: ago(90),
    },
    {
        id: 'conv-3',
        type: 'dm' as const,
        name: undefined as string | undefined,
        avatar_url: undefined as string | undefined,
        participant_ids: ['usr-1', 'usr-4'],
        last_message: {
            id: 'msg-3-5',
            content: 'The merino sweaters just dropped — thought you\'d want first pick.',
            sender_id: 'usr-4',
            sender_display_name: u('usr-4').display_name,
            sender_avatar_url: u('usr-4').avatar_url,
            created_at: ago(1),
        },
        unread_count: 0,
        created_at: ago(15),
    },
];

// ─── Messages (per conversation) ─────────────────────────────────────────────

function msg(
    id: string,
    convId: string,
    senderId: string,
    content: string,
    daysAgo: number,
    hoursAgo = 0,
    minutesAgo = 0,
) {
    const usr = u(senderId);
    return {
        id,
        conversation_id: convId,
        sender_id: usr.id,
        sender_display_name: usr.display_name,
        sender_avatar_url: usr.avatar_url,
        sender_username: usr.username,
        content,
        status: 'read',
        created_at: ago(daysAgo, hoursAgo, minutesAgo),
        edited_at: undefined as string | undefined,
        reply_to_id: undefined as string | undefined,
        reply_to_content: undefined as string | undefined,
        reply_to_sender_name: undefined as string | undefined,
        attachments: [] as unknown[],
        reactions: [] as unknown[],
    };
}

export const MESSAGES: Record<string, ReturnType<typeof msg>[]> = {
    'conv-1': [
        msg('msg-1-1', 'conv-1', 'usr-1', 'Hey! Did you end up reading that article I sent about MSW?', 3),
        msg('msg-1-2', 'conv-1', 'usr-2', 'Not yet, been swamped. What\'s the TL;DR?', 3, 0, 5),
        msg('msg-1-3', 'conv-1', 'usr-1', 'It\'s about using service workers to mock API calls in dev — basically how to build a frontend before the backend exists.', 3, 0, 7),
        msg('msg-1-4', 'conv-1', 'usr-2', 'Oh interesting. Does it work with React Query?', 3, 0, 10),
        {
            ...msg('msg-1-5', 'conv-1', 'usr-1', 'Yep, perfectly. MSW intercepts at the network level so your hooks have no idea they\'re talking to a mock.', 3, 0, 12),
            reply_to_id: 'msg-1-4',
            reply_to_content: 'Oh interesting. Does it work with React Query?',
            reply_to_sender_name: u('usr-2').display_name,
        },
        msg('msg-1-6', 'conv-1', 'usr-2', 'That sounds way cleaner than mocking the whole fetch function.', 2),
        msg('msg-1-7', 'conv-1', 'usr-1', 'Exactly. And moving to the real backend later is just removing the handlers one by one.', 2, 0, 1),
        msg('msg-1-8', 'conv-1', 'usr-2', 'Sold. I\'ll set it up this weekend.', 1),
        {
            ...msg('msg-1-9', 'conv-1', 'usr-1', 'Nice! I\'ll send you the quickstart link.', 0, 3),
            reply_to_id: 'msg-1-8',
            reply_to_content: 'Sold. I\'ll set it up this weekend.',
            reply_to_sender_name: u('usr-2').display_name,
        },
        msg('msg-1-10', 'conv-1', 'usr-2', 'Let me know what you think once you\'ve had a chance to read it!', 0, 2),
    ],
    'conv-2': [
        msg('msg-2-1', 'conv-2', 'usr-3', 'Morning everyone. Sprint review at 2pm today.', 1, 8),
        msg('msg-2-2', 'conv-2', 'usr-5', 'Got it, will have the demo ready.', 1, 8, 5),
        msg('msg-2-3', 'conv-2', 'usr-1', 'Same. Quick question — do we still have the auth refactor slotted for this sprint?', 1, 9),
        msg('msg-2-4', 'conv-2', 'usr-2', 'It\'s on the board but might need to slip. Dave, any concerns?', 1, 9, 15),
        msg('msg-2-5', 'conv-2', 'usr-3', 'Yeah there\'s a cross-cutting concern with the token refresh flow that needs more investigation.', 1, 10),
        msg('msg-2-6', 'conv-2', 'usr-1', 'Let\'s timebox a spike today and decide in planning tomorrow.', 0, 14),
        msg('msg-2-7', 'conv-2', 'usr-5', 'Sounds good to me.', 0, 14, 3),
        msg('msg-2-8', 'conv-2', 'usr-3', 'We should move the auth refactor to next sprint.', 0, 5),
    ],
    'conv-3': [
        msg('msg-3-1', 'conv-3', 'usr-4', 'Hi Alex! Loved your post about standing desk mats.', 15),
        msg('msg-3-2', 'conv-3', 'usr-1', 'Oh thanks! The bamboo hybrid one really is something else.', 15, 0, 20),
        msg('msg-3-3', 'conv-3', 'usr-4', 'I saw you ordered the bamboo mat from our shop — hope it\'s working well!', 14),
        msg('msg-3-4', 'conv-3', 'usr-1', 'It\'s great, my back already feels better after 2 weeks. Recommend it to everyone.', 14, 0, 30),
        msg('msg-3-5', 'conv-3', 'usr-4', 'The merino sweaters just dropped — thought you\'d want first pick.', 1),
    ],
};
