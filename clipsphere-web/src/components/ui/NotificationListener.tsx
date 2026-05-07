"use client";

import { useSocket } from "@/context/SocketContext";
import LiveToast from "@/components/ui/LiveToast";

export default function NotificationListener() {
  const { activeToast, dismissToast } = useSocket();

  if (!activeToast) return null;

  if (activeToast.type === "new-like") {
    return (
      <LiveToast
        key={activeToast.id}
        kind="like"
        primaryText={`${activeToast.likerUsername} liked your video`}
        secondaryText={`"${activeToast.videoTitle}"`}
        href={`/video/${activeToast.videoId}`}
        onClose={dismissToast}
      />
    );
  }

  if (activeToast.type === "new-tip") {
    return (
      <LiveToast
        key={activeToast.id}
        kind="tip"
        primaryText={`${activeToast.senderUsername} tipped you ${activeToast.amountFormatted}!`}
        secondaryText="Open settings to view your wallet."
        href="/settings"
        onClose={dismissToast}
      />
    );
  }

  return null;
}