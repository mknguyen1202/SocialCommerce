import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import AdminPage from "./pages/AdminPage";
import { useAuthContext } from "./app/providers/AuthProvider";

function Nav() {
    const { user, logout } = useAuthContext();
    return (
        <nav style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #eee" }}>
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/admin">Admin</Link>
            <span style={{ marginLeft: "auto" }}>
                {user ? (
                    <>
                        <span style={{ marginRight: 8 }}>{user.name ?? user.email}</span>
                        <button onClick={logout}>Logout</button>
                    </>
                ) : (
                    <Link to="/login">Login</Link>
                )}
            </span>
        </nav>
    );
}

function Home() {
    return (
        <div style={{ padding: 24 }}>
            <h1>Home</h1>
            <p>This is a public page. Try Dashboard (requires auth) or Admin (requires role/permission).</p>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Nav />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<LoginPage />} />

                <Route
                    path="/dashboard"
                    element={
                        <RequireAuth>
                            <Dashboard />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <RequireAuth>
                            <AdminPage />
                        </RequireAuth>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}
