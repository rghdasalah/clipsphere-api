"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

export type LiveNotification =
  | {
      id: string;
      type: "new-like";
      likerUsername: string;
      videoTitle: string;
      videoId: string;
      createdAt: Date;
    }
  | {
      id: string;
      type: "new-tip";
      senderUsername: string;
      amountFormatted: string;
      createdAt: Date;
    };

interface SocketContextType {
  unreadCount: number;
  activeToast: LiveNotification | null;
  dismissToast: () => void;
  clearAll: () => void;
}

const SocketContext = createContext<SocketContextType>({
  unreadCount: 0,
  activeToast: null,
  dismissToast: () => {},
  clearAll: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<LiveNotification | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const dismissToast = useCallback(() => setActiveToast(null), []);

  // "Clear all" now persists to the server so a reload reflects it.
  const clearAll = useCallback(async () => {
    setUnreadCount(0);
    setActiveToast(null);
    try {
      await api.patch("/notifications/read-all");
    } catch (err) {
      console.warn("[notifications] failed to mark read on server:", err);
    }
  }, []);

  // Hydrate the unread count from the DB whenever auth becomes ready.
  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    api
      .get<{ status: string; data: { unreadCount: number } }>(
        "/notifications/unread-count"
      )
      .then(({ data }) => {
        if (!cancelled && typeof data.data?.unreadCount === "number") {
          setUnreadCount(data.data.unreadCount);
        }
      })
      .catch((err) =>
        console.warn("[notifications] initial unread fetch failed:", err.message)
      );
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const token = Cookies.get("token");
    if (!token) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      timeout: 10_000,
    });

    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      console.warn("[socket] connect error:", err.message);
    });

    socket.on(
      "new-like",
      (data: { likerUsername: string; videoTitle: string; videoId: string }) => {
        setUnreadCount((prev) => prev + 1);
        setActiveToast({
          id: `${Date.now()}-${Math.random()}`,
          type: "new-like",
          likerUsername: data.likerUsername,
          videoTitle: data.videoTitle,
          videoId: data.videoId,
          createdAt: new Date(),
        });
      }
    );

    socket.on(
      "new-tip",
      (data: { senderUsername: string; amountFormatted: string }) => {
        setUnreadCount((prev) => prev + 1);
        setActiveToast({
          id: `${Date.now()}-${Math.random()}`,
          type: "new-tip",
          senderUsername: data.senderUsername,
          amountFormatted: data.amountFormatted,
          createdAt: new Date(),
        });
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, isLoading]);

  const value = useMemo(
    () => ({ unreadCount, activeToast, dismissToast, clearAll }),
    [unreadCount, activeToast, dismissToast, clearAll]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}