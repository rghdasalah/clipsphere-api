"use client";

import { useSocket } from "@/context/SocketContext";
import LiveToast from "@/components/ui/LiveToast";

export default function NotificationListener() {
  const { activeToast, dismissToast } = useSocket();

  if (!activeToast || activeToast.type !== "new-like") return null;

  return (
    <LiveToast
      key={activeToast.id}
      likerUsername={activeToast.likerUsername}
      videoTitle={activeToast.videoTitle}
      videoId={activeToast.videoId}
      onClose={dismissToast}
    />
  );
}