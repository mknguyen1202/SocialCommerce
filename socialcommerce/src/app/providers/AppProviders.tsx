import React, { useEffect } from 'react';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { useUIStore } from '../stores/uiStore';

const ThemeSync: React.FC = () => {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
};

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryProvider>
    <AuthProvider>
      <ThemeSync />
      {children}
    </AuthProvider>
  </QueryProvider>
);
