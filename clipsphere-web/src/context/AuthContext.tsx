"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import Cookies from "js-cookie";
import { AxiosError } from "axios";
import api from "@/services/api";
import type { ApiResponse, User } from "@/types";

const TOKEN_COOKIE = "token";
const USER_STORAGE_KEY = "clipsphere_user";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── localStorage helpers (SSR-safe) ─────────────────────────────────────────
function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (parsed && typeof parsed === "object" && parsed._id) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    /* storage full / disabled */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Tri-state: undefined = still booting, null = logged out, User = logged in.
  // Initial value MUST match between server and client → use undefined.
  const [user, setUserState] = useState<User | null | undefined>(undefined);
  const didBootstrap = useRef(false);

  // Single source of truth for state + persistence.
  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    writeCachedUser(u);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = Cookies.get(TOKEN_COOKIE);
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const { data } = await api.get<ApiResponse<User>>("/users/me");
      if (data?.data) {
        setUser(data.data);
      }
      // If response shape is wrong but no error, leave the cached user alone.
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      // ONLY log out on a real auth rejection.
      if (status === 401) {
        Cookies.remove(TOKEN_COOKIE, { path: "/" });
        setUser(null);
      } else {
        // Network error / 5xx / CORS hiccup: KEEP THE SESSION.
        // The cached user from localStorage stays valid.
        console.warn(
          "[auth] refreshUser failed (keeping cached session):",
          axiosErr.message || "unknown error"
        );
      }
    }
  }, [setUser]);

  // Bootstrap on mount: rehydrate from cache, then refresh in background.
  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;

    const token = Cookies.get(TOKEN_COOKIE);
    const cached = readCachedUser();

    if (token && cached) {
      // Best case: we have BOTH a token AND a cached user. The user is
      // logged in IMMEDIATELY — no waiting for /users/me.
      setUserState(cached);
    } else if (token && !cached) {
      // Token but no cached user (e.g. cookie set externally). Mark as
      // not-yet-logged-in until refresh confirms.
      setUserState(undefined);
    } else {
      // No token = definitely logged out. Clear any stale cache.
      writeCachedUser(null);
      setUserState(null);
    }

    // Always run a background refresh to sync with the server.
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<
        ApiResponse<{ token: string; user: User }>
      >("/auth/login", { email, password });

      const token = data.data?.token;
      const userData = data.data?.user;
      if (!token || !userData) {
        throw new Error("Login response did not include a token.");
      }

      // Path is set explicitly so the cookie is reachable from every route
      // (some browsers default to the current path otherwise).
      Cookies.set(TOKEN_COOKIE, token, {
        expires: 7,
        path: "/",
        sameSite: "lax",
      });
      setUser(userData);
    },
    [setUser]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const { data } = await api.post<
        ApiResponse<{ token: string; user: User }>
      >("/auth/register", { username, email, password });

      const token = data.data?.token;
      const userData = data.data?.user;
      if (!token || !userData) {
        throw new Error("Register response did not include a token.");
      }

      Cookies.set(TOKEN_COOKIE, token, {
        expires: 7,
        path: "/",
        sameSite: "lax",
      });
      setUser(userData);
    },
    [setUser]
  );

  const logout = useCallback(() => {
    Cookies.remove(TOKEN_COOKIE, { path: "/" });
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [setUser]);

  const value = useMemo(
    () => ({
      user: user ?? null,
      isLoading: user === undefined,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}