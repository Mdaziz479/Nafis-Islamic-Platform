"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly isLoading: boolean;
  refreshAuth: () => Promise<AuthUser | null>;
  setAuthenticatedUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AUTH_CHANGE_EVENT = "sakinah-auth-change";
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (response.status === 401) {
        setUser(null);
        return null;
      }
      if (!response.ok) throw new Error("Your account status could not be refreshed.");
      const result = await response.json() as { user?: AuthUser };
      const nextUser = result.user ?? null;
      setUser(nextUser);
      return nextUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleAuthChange = () => void refreshAuth().catch(() => undefined);
    void refreshAuth().catch(() => undefined);
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
  }, [refreshAuth]);

  const setAuthenticatedUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    setIsLoading(false);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }, []);

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("Sign out could not be completed. Please try again.");
    setUser(null);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    refreshAuth,
    setAuthenticatedUser,
    logout,
  }), [user, isLoading, refreshAuth, setAuthenticatedUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}