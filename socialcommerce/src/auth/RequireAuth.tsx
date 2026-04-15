import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../app/providers/AuthProvider";

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuthContext();
    const loc = useLocation();

    if (loading) return <p>Loading…</p>;
    if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;

    return <>{children}</>;
};
