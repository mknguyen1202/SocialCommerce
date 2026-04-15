export type User = {
    id: string;
    name: string | null;
    email: string | null;
    roles: string[];         // e.g., ["Admin"]
    permissions: string[];   // e.g., ["user.read", "orders.write"]
    isNew?: boolean;         // optional (if your backend sends it)
} | null;