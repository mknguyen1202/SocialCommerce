// src/pages/AdminPage.tsx
import { RequirePermission } from "../auth/RequirePermission";

export default function AdminPage() {
    return (
        <RequirePermission roleAnyOf={["Admin"]} anyOf={["admin.only"]} fallback={<p>Admins only.</p>}>
            <div style={{ padding: 24 }}>
                <h1>Admin</h1>
                <p>You can see this because you are an Admin and/or have the "admin.only" permission.</p>
            </div>
        </RequirePermission>
    );
}
