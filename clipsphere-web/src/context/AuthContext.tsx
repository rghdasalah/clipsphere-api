"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Cookies from "js-cookie";
import api from "@/services/api";
import type { ApiResponse, User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const refreshUser = useCallback(async () => {
    try {
      const token = Cookies.get("token");
      if (!token) { setUser(null); return; }
      const { data } = await api.get("/users/me");
      setUser(data.data);
    } catch {
      setUser(null);
      Cookies.remove("token");
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<{ token: string; user: User }>>(
      "/auth/login",
      { email, password }
    );

    const token = data.data?.token;
    const userData = data.data?.user;

    if (!token || !userData) throw new Error("Login response did not include a token.");

    Cookies.set("token", token, { expires: 7 });
    // Set user directly — no second API call, no async race with navigation
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    Cookies.remove("token");
    setUser(null);
    window.location.href = "/";
  }, []);

  const value = useMemo(
    () => ({
      user: user ?? null,
      isLoading: user === undefined,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
    }),
    [user, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}