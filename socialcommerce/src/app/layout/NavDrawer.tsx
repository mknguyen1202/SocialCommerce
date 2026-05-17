import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Avatar } from '../../shared/components/Avatar';
import { Badge } from '../../shared/components/Badge';
import { Icon } from '../../shared/components/Icon';
import {
    MessageSquare, Newspaper, Clapperboard, ShoppingBag,
    Sun, Moon, LogOut, X, User, Settings,
} from '../../shared/components/iconRegistry';
import { useUIStore, type Domain } from '../stores/uiStore';
import { useAuthContext } from '../providers/AuthProvider';

interface NavItem {
    domain: Domain;
    label: string;
    icon: LucideIcon;
    path: string;
}

const NAV_ITEMS: NavItem[] = [
    { domain: 'communication', label: 'Communication', icon: MessageSquare, path: '/communication' },
    { domain: 'social',         label: 'Social',         icon: Newspaper,     path: '/social' },
    { domain: 'streaming',      label: 'Streaming',      icon: Clapperboard,  path: '/streaming' },
    { domain: 'commerce',       label: 'Shop',           icon: ShoppingBag,   path: '/commerce' },
];

export const NavDrawer: React.FC = () => {
    const navigate = useNavigate();
    const {
        isNavDrawerOpen,
        closeNavDrawer,
        activeDomain,
        setActiveDomain,
        unreadCounts,
        theme,
        toggleTheme,
    } = useUIStore();
    const { user, logout } = useAuthContext();

    const displayName = user?.name ?? user?.email ?? 'User';

    if (!isNavDrawerOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                aria-hidden="true"
                onClick={closeNavDrawer}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 290,
                }}
            />

            {/* Drawer panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 280,
                    background: 'var(--color-surface-2)',
                    borderRight: '1px solid var(--color-border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 295,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                }}
            >
                {/* User profile header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-4)',
                        borderBottom: '1px solid var(--color-border-default)',
                    }}
                >
                    <Avatar src={user?.avatarUrl} name={displayName} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 'var(--font-size-base)',
                                fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                                color: 'var(--color-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {displayName}
                        </p>
                        {user?.email && (
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-secondary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {user.email}
                            </p>
                        )}
                    </div>
                    <button
                        aria-label="Close navigation"
                        onClick={closeNavDrawer}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 'var(--radius-sm)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Icon icon={X} size={18} />
                    </button>
                </div>

                {/* Domain nav items */}
                <nav aria-label="Domain navigation" style={{ padding: 'var(--space-2) 0' }}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeDomain === item.domain;
                        const unread = unreadCounts[item.domain];
                        return (
                            <NavLink
                                key={item.domain}
                                to={item.path}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => {
                                    setActiveDomain(item.domain);
                                    closeNavDrawer();
                                }}
                            style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-3) var(--space-4)',
                                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                    background: isActive ? 'var(--color-surface-3)' : 'transparent',
                                    textDecoration: 'none',
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: isActive
                                        ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight'])
                                        : ('var(--font-weight-normal)' as React.CSSProperties['fontWeight']),
                                    borderLeft: `3px solid ${isActive ? 'var(--color-brand-primary)' : 'transparent'}`,
                                    transition: 'background var(--transition-fast)',
                                }}
                            >
                                <Icon icon={item.icon} size={18} />
                                <span style={{ flex: 1 }}>{item.label}</span>
                                {unread > 0 && <Badge count={unread} />}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Footer actions */}
                <div style={{ borderTop: '1px solid var(--color-border-default)', padding: 'var(--space-2) 0' }}>
                    {/* Profile */}
                    <button
                        onClick={() => { navigate('/profile'); closeNavDrawer(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                            width: '100%', padding: 'var(--space-3) var(--space-4)',
                            background: 'none', border: 'none', color: 'var(--color-text-secondary)',
                            cursor: 'pointer', fontSize: 'var(--font-size-base)', textAlign: 'left',
                        }}
                    >
                        <Icon icon={User} size={18} />
                        <span>My Profile</span>
                    </button>
                    {/* Settings */}
                    <button
                        onClick={() => { navigate('/settings'); closeNavDrawer(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                            width: '100%', padding: 'var(--space-3) var(--space-4)',
                            background: 'none', border: 'none', color: 'var(--color-text-secondary)',
                            cursor: 'pointer', fontSize: 'var(--font-size-base)', textAlign: 'left',
                        }}
                    >
                        <Icon icon={Settings} size={18} />
                        <span>Settings</span>
                    </button>
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                            width: '100%', padding: 'var(--space-3) var(--space-4)',
                            background: 'none', border: 'none', color: 'var(--color-text-secondary)',
                            cursor: 'pointer', fontSize: 'var(--font-size-base)', textAlign: 'left',
                        }}
                    >
                        <Icon icon={theme === 'dark' ? Sun : Moon} size={18} />
                        <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                    </button>
                    {/* Sign out */}
                    <button
                        onClick={() => { void logout(); closeNavDrawer(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                            width: '100%', padding: 'var(--space-3) var(--space-4)',
                            background: 'none', border: 'none', color: 'var(--color-danger)',
                            cursor: 'pointer', fontSize: 'var(--font-size-base)', textAlign: 'left',
                        }}
                    >
                        <Icon icon={LogOut} size={18} />
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};
