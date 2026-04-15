import React from 'react';
import { useAuthContext } from '../app/providers/AuthProvider';

const Dashboard: React.FC = () => {

    const { user, logout, apiFetch } = useAuthContext();

    const callProtected = async () => {
        const res = await apiFetch("/api/profile");
        alert(await res.text());
    };


    return (
        <div style={{ padding: 24 }}>
            <h1>Dashboard</h1>
            <p>Welcome {user?.name ?? user?.email ?? "there"}!</p>
            {user?.isNew && <p style={{ color: "green" }}>First time here—welcome aboard 🎉</p>}

            <div style={{ margin: "16px 0" }}>
                <strong>Your claims</strong>
                <pre style={{ background: "#696969FF", padding: 12 }}>
                    {JSON.stringify(user, null, 2)}
                </pre>
            </div>
            <div>
                <img src="https://lh3.googleusercontent.com/a/ACg8ocLQPwHUj8XwSOW44gRtZZYk4kT9jSpLmVkGWwriygnrAUrI6g=s96-c" alt="User Avatar" style={{ borderRadius: "50%", width: 100, height: 100 }} />
            </div>
            <button onClick={callProtected}>Call protected API</button>{" "}
            <button onClick={logout}>Logout</button>
        </div>
    );
};

export default Dashboard;
