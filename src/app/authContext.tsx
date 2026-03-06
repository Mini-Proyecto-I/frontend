import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { login as apiLogin, refreshToken as apiRefreshToken } from "@/api/services/auth";
import { queryCache } from "@/lib/queryCache";

type AuthUser = {
  email: string;
  name: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function decodeJwtPayload(token: string): any | null {
  try {
    const [, payload] = token.split(".");
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Inicializar desde localStorage
  useEffect(() => {
    const storedAccess = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedRefresh = window.localStorage.getItem(REFRESH_TOKEN_KEY);

    if (storedAccess) {
      const payload = decodeJwtPayload(storedAccess);
      if (payload?.email && payload?.name) {
        setAccessToken(storedAccess);
        setUser({ email: payload.email, name: payload.name });
        setLoading(false);
        return;
      }
    }

    // Si hay refresh token pero no access token válido, podemos intentar refrescar más adelante
    if (!storedAccess && storedRefresh) {
      apiRefreshToken(storedRefresh)
        .then((data) => {
          const newAccess = data.access;
          window.localStorage.setItem(ACCESS_TOKEN_KEY, newAccess);
          setAccessToken(newAccess);
          const payload = decodeJwtPayload(newAccess);
          if (payload?.email && payload?.name) {
            setUser({ email: payload.email, name: payload.name });
          }
        })
        .catch(() => {
          window.localStorage.removeItem(ACCESS_TOKEN_KEY);
          window.localStorage.removeItem(REFRESH_TOKEN_KEY);
          setUser(null);
          setAccessToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    const { access, refresh } = data;

    window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);

    setAccessToken(access);

    const payload = decodeJwtPayload(access);
    if (payload?.email && payload?.name) {
      setUser({ email: payload.email, name: payload.name });
    } else {
      setUser(null);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
    // Clear all cached API responses so the next user starts with a clean slate
    queryCache.clear();
  };

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    loading,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

