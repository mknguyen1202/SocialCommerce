import React, { lazy, Suspense } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useIsMobile } from '../shared/hooks/useIsMobile';
import { Icon } from '../shared/components/Icon';
import { User, Palette, Bell, Shield, LogOut } from '../shared/components/iconRegistry';
import { useUIStore } from '../app/stores/uiStore';
import { useAuthContext } from '../app/providers/AuthProvider';
import type { LucideIcon } from 'lucide-react';

/* ── Sub-tabs ──────────────────────────────────────────────── */

interface TabDef {
    path: string;
    label: string;
    icon: LucideIcon;
}

const TABS: TabDef[] = [
    { path: 'appearance', label: 'Appearance', icon: Palette },
    { path: 'account', label: 'Account', icon: User },
    { path: 'notifications', label: 'Notifications', icon: Bell },
    { path: 'privacy', label: 'Privacy', icon: Shield },
];

/* ── Appearance tab ────────────────────────────────────────── */

const AppearanceTab: React.FC = () => {
    const { theme, toggleTheme } = useUIStore();

    const themeOptions: Array<{ value: 'dark' | 'light'; label: string; description: string }> = [
        { value: 'dark', label: 'Dark', description: 'Easier on the eyes in low light' },
        { value: 'light', label: 'Light', description: 'High contrast in bright environments' },
    ];

    return (
        <section>
            <h2 style={headingStyle}>Appearance</h2>
            <p style={subheadStyle}>Choose how the interface looks for you.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
                {themeOptions.map((opt) => {
                    const active = theme === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { if (!active) toggleTheme(); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 16px',
                                borderRadius: 'var(--radius-md)',
                                border: `1px solid ${active ? 'var(--color-brand-primary)' : 'var(--color-border-default)'}`,
                                background: active ? 'color-mix(in srgb, var(--color-brand-primary) 10%, transparent)' : 'var(--color-surface-2)',
                                color: 'var(--color-text-primary)',
                                cursor: active ? 'default' : 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)' }}>{opt.label}</div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 2 }}>{opt.description}</div>
                            </div>
                            {active && (
                                <span style={{
                                    width: 18, height: 18,
                                    borderRadius: '50%',
                                    background: 'var(--color-brand-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: 11,
                                }}>✓</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

/* ── Account tab ───────────────────────────────────────────── */

const AccountTab: React.FC = () => {
    const { user, logout } = useAuthContext();

    return (
        <section>
            <h2 style={headingStyle}>Account</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
                <div style={rowStyle}>
                    <span style={labelStyle}>Email</span>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>{user?.email ?? '—'}</span>
                </div>
                <div style={rowStyle}>
                    <span style={labelStyle}>Roles</span>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {(user?.roles ?? []).map((r) => (
                            <span key={r} style={chipStyle}>{r}</span>
                        ))}
                    </div>
                </div>
                <div>
                    <button
                        type="button"
                        onClick={() => void logout()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-danger)',
                            background: 'transparent',
                            color: 'var(--color-danger)',
                            fontFamily: 'var(--font-family)',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 'var(--font-weight-semibold)',
                            cursor: 'pointer',
                        }}
                    >
                        <Icon icon={LogOut} size={15} />
                        Sign out
                    </button>
                </div>
            </div>
        </section>
    );
};

/* ── Notifications tab ─────────────────────────────────────── */

type DomainKey = 'communication' | 'social' | 'streaming' | 'commerce';

function loadNotifPrefs(): Record<DomainKey, boolean> {
    try {
        const raw = localStorage.getItem('notif-prefs');
        if (raw) return JSON.parse(raw) as Record<DomainKey, boolean>;
    } catch { /* ignore */ }
    return { communication: true, social: true, streaming: true, commerce: true };
}

const NotificationsTab: React.FC = () => {
    const [prefs, setPrefs] = React.useState(loadNotifPrefs);

    const toggle = (key: DomainKey) => {
        setPrefs((p) => {
            const next = { ...p, [key]: !p[key] };
            localStorage.setItem('notif-prefs', JSON.stringify(next));
            return next;
        });
    };

    const domains: Array<{ key: DomainKey; label: string; description: string }> = [
        { key: 'communication', label: 'Messages & Calls', description: 'Direct messages, group chats, and incoming calls' },
        { key: 'social', label: 'Social Feed', description: 'Mentions, likes, and post replies' },
        { key: 'streaming', label: 'Streams', description: 'Live stream alerts and theater notifications' },
        { key: 'commerce', label: 'Commerce', description: 'Order updates and cart reminders' },
    ];

    return (
        <section>
            <h2 style={headingStyle}>Notifications</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
                {domains.map((d) => (
                    <label key={d.key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border-default)',
                        background: 'var(--color-surface-2)',
                        cursor: 'pointer',
                    }}>
                        <div>
                            <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>{d.label}</div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 2 }}>{d.description}</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={prefs[d.key]}
                            onChange={() => toggle(d.key)}
                            style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
                        />
                    </label>
                ))}
            </div>
        </section>
    );
};

/* ── Privacy tab ───────────────────────────────────────────── */

const PrivacyTab: React.FC = () => (
    <section>
        <h2 style={headingStyle}>Privacy</h2>
        <p style={subheadStyle}>Privacy controls are coming soon.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
            {['Activity visibility', 'Read receipts', 'Online presence'].map((item) => (
                <div key={item} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-default)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-base)',
                }}>
                    <span>{item}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Soon</span>
                </div>
            ))}
        </div>
    </section>
);

/* ── Shared micro-styles ───────────────────────────────────── */

const headingStyle: React.CSSProperties = {
    fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
    fontWeight: 'var(--font-weight-bold)',
    lineHeight: 1.2,
    color: 'var(--color-text-primary)',
    margin: 0,
};

const subheadStyle: React.CSSProperties = {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
    marginTop: 'var(--space-2)',
};

const rowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
};

const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--color-text-muted)',
};

const chipStyle: React.CSSProperties = {
    padding: '3px 9px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-surface-3)',
    border: '1px solid var(--color-border-muted)',
    fontSize: 'var(--font-size-xs)',
    fontFamily: 'var(--font-mono, monospace)',
    color: 'var(--color-text-secondary)',
};

/* ── SettingsPage shell ────────────────────────────────────── */

const SettingsPage: React.FC = () => {
    const isMobile = useIsMobile();
    const location = useLocation();

    const tabLinkStyle = (active: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: isMobile ? '8px 14px' : '10px 16px',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        background: active ? 'var(--color-surface-3)' : 'transparent',
        border: 'none',
        textDecoration: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background var(--transition-fast), color var(--transition-fast)',
    });

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: '100%',
        overflow: 'hidden',
    };

    const navStyle: React.CSSProperties = isMobile
        ? {
            display: 'flex',
            flexDirection: 'row',
            overflowX: 'auto',
            gap: 'var(--space-1)',
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid var(--color-border-default)',
            background: 'var(--color-surface-2)',
            scrollbarWidth: 'none',
        }
        : {
            width: 200,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
            padding: 'var(--space-6) var(--space-4)',
            borderRight: '1px solid var(--color-border-default)',
            background: 'var(--color-surface-2)',
        };

    const contentStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? 'var(--space-5) var(--space-4)' : 'var(--space-8) var(--space-8)',
        paddingBottom: 'calc(var(--layout-tab-bar-height, 64px) + var(--space-6))',
        maxWidth: isMobile ? undefined : 680,
    };

    return (
        <div style={containerStyle}>
            {/* Sidebar / tab strip */}
            <nav style={navStyle} aria-label="Settings sections">
                {!isMobile && (
                    <p style={{ ...labelStyle, padding: '0 var(--space-2)', marginBottom: 'var(--space-3)' }}>Settings</p>
                )}
                {TABS.map((tab) => {
                    const active = location.pathname.includes(`/settings/${tab.path}`);
                    return (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            style={tabLinkStyle(active)}
                        >
                            <Icon icon={tab.icon} size={15} />
                            {tab.label}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Content panel */}
            <div style={contentStyle}>
                <Routes>
                    <Route index element={<Navigate to="appearance" replace />} />
                    <Route path="appearance" element={<AppearanceTab />} />
                    <Route path="account" element={<AccountTab />} />
                    <Route path="notifications" element={<NotificationsTab />} />
                    <Route path="privacy" element={<PrivacyTab />} />
                </Routes>
            </div>
        </div>
    );
};

export default SettingsPage;
