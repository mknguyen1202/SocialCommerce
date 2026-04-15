import React, { useState } from 'react';
import { Avatar } from '../../shared/components/Avatar';
import { Badge } from '../../shared/components/Badge';
import { Dropdown } from '../../shared/components/Dropdown';
import { UnifiedSearch } from './UnifiedSearch';
import { useUIStore } from '../stores/uiStore';
import { useAuthContext } from '../providers/AuthProvider';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

export const TopBar: React.FC = () => {
  const isMobile = useIsMobile();
  const {
    isNotificationPanelOpen,
    toggleNotificationPanel,
    toggleProfilePanel,
    openNavDrawer,
    unreadCounts,
    theme,
    toggleTheme,
  } = useUIStore();

  const { user, logout } = useAuthContext();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const displayName = user?.name ?? user?.email ?? 'User';
  const initials = displayName
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const flatIconBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    border: '1px solid var(--color-border-default)',
    color: 'var(--color-text-secondary)',
    fontSize: 16,
    cursor: 'pointer',
    transition: 'background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
  };
  const hoverIcon = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)';
    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-emphasis)';
    (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
  };
  const unhoverIcon = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.background = 'transparent';
    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-default)';
    (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
  };

  return (
    <>
      <header
        style={{
          height: 'var(--topbar-height)',
          background: 'var(--color-topbar-bg)',
          borderBottom: '1px solid var(--color-border-default)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--space-4)',
          flexShrink: 0,
        }}
      >
        {/* Mobile hamburger — visible only on xs/sm */}
        {isMobile && (
          <button
            aria-label="Open navigation"
            onClick={openNavDrawer}
            style={{ ...flatIconBtn, marginRight: 'var(--space-2)' }}
            onMouseEnter={hoverIcon}
            onMouseLeave={unhoverIcon}
          >
            ☰
          </button>
        )}

        {/* Right controls — pushed to far right via margin-left: auto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginLeft: 'auto' }}>
          {/* Search trigger */}
          <button
            aria-label="Search"
            onClick={() => setIsSearchOpen(true)}
            style={flatIconBtn}
            onMouseEnter={hoverIcon}
            onMouseLeave={unhoverIcon}
          >
            🔍
          </button>

          {/* Theme toggle — desktop only; available in nav drawer on mobile */}
          {!isMobile && (
            <button
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={toggleTheme}
              style={flatIconBtn}
              onMouseEnter={hoverIcon}
              onMouseLeave={unhoverIcon}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}

          {/* Notification bell */}
          <button
            aria-label={`Notifications${totalUnread > 0 ? `, ${totalUnread} unread` : ''}`}
            aria-expanded={isNotificationPanelOpen}
            onClick={toggleNotificationPanel}
            style={{ ...flatIconBtn, position: 'relative' }}
            onMouseEnter={hoverIcon}
            onMouseLeave={unhoverIcon}
          >
            🔔
            {totalUnread > 0 && (
              <Badge
                count={totalUnread}
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  border: '2px solid var(--color-topbar-bg)',
                }}
              />
            )}
          </button>

          {/* Profile avatar + dropdown */}
          <Dropdown
            align="right"
            trigger={
              <button
                aria-label="Profile menu"
                onClick={toggleProfilePanel}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border-default)',
                  cursor: 'pointer',
                  padding: 2,
                  borderRadius: 'var(--radius-full)',
                  transition: 'border-color var(--transition-fast)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-emphasis)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-default)'; }}
              >
                <Avatar initials={initials} size="sm" />
              </button>
            }
            items={[
              {
                key: 'name',
                label: <strong>{displayName}</strong>,
                disabled: true,
              },
              {
                key: 'profile',
                label: 'My Profile',
                onClick: toggleProfilePanel,
              },
              {
                key: 'settings',
                label: 'Settings',
              },
              {
                key: 'logout',
                label: 'Sign Out',
                danger: true,
                onClick: () => void logout(),
              },
            ]}
          />
        </div>{/* end right controls */}
      </header>

      <UnifiedSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
