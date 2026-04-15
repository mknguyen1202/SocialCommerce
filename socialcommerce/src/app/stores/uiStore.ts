import { create } from 'zustand';

export type Domain = 'communication' | 'social' | 'streaming' | 'commerce';
export type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

interface UIState {
  // Theme
  theme: Theme;
  toggleTheme: () => void;

  // Active domain (drives nav rail highlight)
  activeDomain: Domain;
  setActiveDomain: (domain: Domain) => void;

  // Notification panel
  isNotificationPanelOpen: boolean;
  toggleNotificationPanel: () => void;
  closeNotificationPanel: () => void;

  // Profile panel
  isProfilePanelOpen: boolean;
  toggleProfilePanel: () => void;
  closeProfilePanel: () => void;

  // Mobile navigation drawer
  isNavDrawerOpen: boolean;
  openNavDrawer: () => void;
  closeNavDrawer: () => void;

  // Per-domain unread badge counts
  unreadCounts: Record<Domain, number>;
  setUnreadCount: (domain: Domain, count: number) => void;
  incrementUnread: (domain: Domain) => void;
  clearUnread: (domain: Domain) => void;

  // "Reconnecting" banner visibility
  showReconnectBanner: boolean;
  setReconnectBanner: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return { theme: next };
    }),

  activeDomain: 'communication',
  setActiveDomain: (domain) => set({ activeDomain: domain }),

  isNotificationPanelOpen: false,
  toggleNotificationPanel: () =>
    set((s) => ({ isNotificationPanelOpen: !s.isNotificationPanelOpen, isProfilePanelOpen: false })),
  closeNotificationPanel: () => set({ isNotificationPanelOpen: false }),

  isProfilePanelOpen: false,
  toggleProfilePanel: () =>
    set((s) => ({ isProfilePanelOpen: !s.isProfilePanelOpen, isNotificationPanelOpen: false })),
  closeProfilePanel: () => set({ isProfilePanelOpen: false }),

  isNavDrawerOpen: false,
  openNavDrawer: () => set({ isNavDrawerOpen: true }),
  closeNavDrawer: () => set({ isNavDrawerOpen: false }),

  unreadCounts: { communication: 0, social: 0, streaming: 0, commerce: 0 },
  setUnreadCount: (domain, count) =>
    set((s) => ({ unreadCounts: { ...s.unreadCounts, [domain]: count } })),
  incrementUnread: (domain) =>
    set((s) => ({
      unreadCounts: { ...s.unreadCounts, [domain]: s.unreadCounts[domain] + 1 },
    })),
  clearUnread: (domain) =>
    set((s) => ({ unreadCounts: { ...s.unreadCounts, [domain]: 0 } })),

  showReconnectBanner: false,
  setReconnectBanner: (show) => set({ showReconnectBanner: show }),
}));
