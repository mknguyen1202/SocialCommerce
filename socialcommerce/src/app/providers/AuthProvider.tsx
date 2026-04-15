import React, { createContext, useContext } from 'react';
import { useAuth } from '../../auth/useAuth';
import type { User } from '../../auth/types';

interface AuthContextValue {
  user: User;
  loading: boolean;
  login: (provider: 'Google' | 'Microsoft' | 'Facebook' | 'Apple') => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (perms: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();

  const value: AuthContextValue = {
    user: auth.user,
    loading: auth.loading,
    login: auth.login,
    loginWithEmail: auth.loginWithEmail,
    logout: auth.logout,
    isAuthenticated: !!auth.user,
    apiFetch: auth.apiFetch,
    hasRole: auth.hasRole,
    hasAnyPermission: auth.hasAnyPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
