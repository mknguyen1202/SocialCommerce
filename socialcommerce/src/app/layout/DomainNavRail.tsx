import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from '../../shared/components/Tooltip';
import { Badge } from '../../shared/components/Badge';
import { useUIStore, type Domain } from '../stores/uiStore';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

interface NavItem {
  domain: Domain;
  label: string;
  emoji: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { domain: 'communication', label: 'Communication', emoji: '💬', path: '/communication' },
  { domain: 'social', label: 'Social', emoji: '📰', path: '/social' },
  { domain: 'streaming', label: 'Streaming', emoji: '🎬', path: '/streaming' },
  { domain: 'commerce', label: 'Shop', emoji: '🛒', path: '/commerce' },
];

export const DomainNavRail: React.FC = () => {
  const isMobile = useIsMobile();
  const { unreadCounts, activeDomain } = useUIStore();

  if (isMobile) return null;

  return (
    <nav
      aria-label="Domain navigation"
      style={{
        width: 'var(--nav-rail-width)',
        background: 'var(--color-nav-bg)',
        borderRight: '1px solid var(--color-border-default)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-3) 0',
        gap: 'var(--space-1)',
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeDomain === item.domain;
        const unread = unreadCounts[item.domain];
        return (
          <Tooltip key={item.domain} label={item.label} placement="right">
            <NavLink
              to={item.path}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--color-surface-3)' : 'transparent',
                color: isActive ? 'var(--color-nav-icon-active)' : 'var(--color-nav-icon)',
                fontSize: 20,
                border: isActive ? '1px solid var(--color-border-default)' : '1px solid transparent',
                transition: 'background var(--transition-fast), color var(--transition-fast)',
                textDecoration: 'none',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: -8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 20,
                    borderRadius: 2,
                    background: 'var(--color-brand-primary)',
                  }}
                />
              )}
              {item.emoji}

              {unread > 0 && (
                <Badge
                  count={unread}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    border: '2px solid var(--color-nav-bg)',
                  }}
                />
              )}
            </NavLink>
          </Tooltip>
        );
      })}
    </nav>
  );
};
