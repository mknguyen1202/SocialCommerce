import React from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from '../../shared/components/Badge';
import { useUIStore, type Domain } from '../stores/uiStore';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

interface TabItem {
    domain: Domain;
    label: string;
    emoji: string;
    path: string;
}

const TAB_ITEMS: TabItem[] = [
    { domain: 'communication', label: 'Chat', emoji: '💬', path: '/communication' },
    { domain: 'social', label: 'Social', emoji: '📰', path: '/social' },
    { domain: 'streaming', label: 'Live', emoji: '🎬', path: '/streaming' },
    { domain: 'commerce', label: 'Shop', emoji: '🛒', path: '/commerce' },
];

export const BottomTabBar: React.FC = () => {
    const isMobile = useIsMobile();
    const { activeDomain, setActiveDomain, unreadCounts } = useUIStore();

    if (!isMobile) return null;

    return (
        <nav
            aria-label="Domain navigation"
            style={{
                display: 'flex',
                height: 'var(--layout-tab-bar-height)',
                background: 'var(--color-nav-bg)',
                borderTop: '1px solid var(--color-border-default)',
                flexShrink: 0,
            }}
        >
            {TAB_ITEMS.map((item) => {
                const isActive = activeDomain === item.domain;
                const unread = unreadCounts[item.domain];
                return (
                    <NavLink
                        key={item.domain}
                        to={item.path}
                        aria-label={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => setActiveDomain(item.domain)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            color: isActive ? 'var(--color-nav-icon-active)' : 'var(--color-nav-icon)',
                            textDecoration: 'none',
                            fontSize: 'var(--font-size-xs)',
                            position: 'relative',
                            transition: 'color var(--transition-fast)',
                            borderTop: `2px solid ${isActive ? 'var(--color-nav-indicator)' : 'transparent'}`,
                        }}
                    >
                        <span style={{ fontSize: 22, position: 'relative' }}>
                            {item.emoji}
                            {unread > 0 && (
                                <Badge
                                    count={unread}
                                    style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -8,
                                        border: '2px solid var(--color-nav-bg)',
                                    }}
                                />
                            )}
                        </span>
                        <span>{item.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
};
