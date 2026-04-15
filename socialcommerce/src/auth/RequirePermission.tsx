import React from "react";
import { useAuthContext } from "../app/providers/AuthProvider";

type Props = {
    anyOf?: string[];   // permission names (e.g., ["admin.only", "orders.write"])
    roleAnyOf?: string[]; // role names (e.g., ["Admin"])
    fallback?: React.ReactNode;
    children: React.ReactNode;
};

export const RequirePermission: React.FC<Props> = ({ anyOf = [], roleAnyOf = [], fallback = null, children }) => {
    const { user, hasAnyPermission, hasRole } = useAuthContext();

    if (!user) return <>{fallback ?? <p>Not authenticated.</p>}</>;

    const okPerm = anyOf.length === 0 || hasAnyPermission(anyOf);
    const okRole = roleAnyOf.length === 0 || roleAnyOf.some(r => hasRole(r));

    if (okPerm && okRole) return <>{children}</>;
    return <>{fallback ?? <p>Not allowed.</p>}</>;
};
