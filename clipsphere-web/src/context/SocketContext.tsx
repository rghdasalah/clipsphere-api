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
import { useAuth } from "@/hooks/useAuth";

export interface LiveNotification {
  id: string;
  type: "new-like";
  likerUsername: string;
  videoTitle: string;
  videoId: string;
  createdAt: Date;
}

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
  const clearAll = useCallback(() => {
    setUnreadCount(0);
    setActiveToast(null);
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const token = Cookies.get("token");
    if (!token) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

    const socket = io(socketUrl, {
      auth: { token },
      // Allow fallback to long-polling when websocket is blocked (some
      // corporate networks, browser extensions, dev proxies).
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
      (data: {
        likerUsername: string;
        videoTitle: string;
        videoId: string;
      }) => {
        const notif: LiveNotification = {
          id: `${Date.now()}-${Math.random()}`,
          type: "new-like",
          likerUsername: data.likerUsername,
          videoTitle: data.videoTitle,
          videoId: data.videoId,
          createdAt: new Date(),
        };
        setUnreadCount((prev) => prev + 1);
        setActiveToast(notif);
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