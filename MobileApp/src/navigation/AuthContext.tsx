import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, getUser, clearSession } from '../utils/storage';
import type { User } from '../types/auth';

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  /** Called by LoginScreen after a successful login to flip navigation to AppNavigator. */
  signIn: (user?: User) => void;
  /** Clears the session and flips navigation back to AuthNavigator. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Restore session on cold start.
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const storedUser = await getUser();
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback((nextUser?: User) => {
    setUser(nextUser ?? null);
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isLoading, isAuthenticated, user, signIn, signOut }),
    [isLoading, isAuthenticated, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
