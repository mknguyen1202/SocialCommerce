/** Shared user fixtures — referenced by id across all domain fixture files */

export interface UserDTO {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    presence: 'online' | 'offline' | 'idle' | 'dnd';
}

/** The currently authenticated user (returned by GET /auth/me). */
export const AUTH_USER = {
    id: 'usr-1',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    roles: ['user'],
    permissions: ['user.read', 'user.write', 'orders.read', 'orders.write'],
};

export const USERS: UserDTO[] = [
    {
        id: 'usr-1',
        username: 'alexj',
        display_name: 'Alex Johnson',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alexj',
        presence: 'online',
    },
    {
        id: 'usr-2',
        username: 'sarahmk',
        display_name: 'Sarah McKenzie',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarahmk',
        presence: 'online',
    },
    {
        id: 'usr-3',
        username: 'devdave',
        display_name: 'Dave Okonkwo',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devdave',
        presence: 'idle',
    },
    {
        id: 'usr-4',
        username: 'priya_r',
        display_name: 'Priya Ramesh',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya_r',
        presence: 'online',
    },
    {
        id: 'usr-5',
        username: 'tomw',
        display_name: 'Tom Wheeler',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tomw',
        presence: 'offline',
    },
    {
        id: 'usr-6',
        username: 'lunaboutique',
        display_name: 'Luna Boutique',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lunaboutique',
        presence: 'online',
    },
];

export function findUser(id: string): UserDTO {
    return USERS.find((u) => u.id === id) ?? USERS[0];
}
