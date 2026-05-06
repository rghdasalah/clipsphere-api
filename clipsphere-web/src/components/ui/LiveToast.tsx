"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

interface LiveToastProps {
  likerUsername: string;
  videoTitle: string;
  videoId?: string;
  onClose: () => void;
}

export default function LiveToast({
  likerUsername,
  videoTitle,
  videoId,
  onClose,
}: LiveToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in on next tick
    const showTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 5 s
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 5000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        "fixed top-20 right-4 z-[100] w-72 rounded-xl border border-brand-500/30 bg-surface-2/80 shadow-2xl backdrop-blur-xl transition-all duration-300",
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-500 text-sm">
          ♥
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-strong">New Like!</p>
          <p className="mt-0.5 text-xs text-text-muted">
            <span className="font-medium text-brand-400">{likerUsername}</span>{" "}
            liked{" "}
            <span className="text-text">
              &ldquo;{videoTitle}&rdquo;
            </span>
          </p>
          {videoId && (
            <Link
              href={`/video/${videoId}`}
              className="mt-1.5 inline-block text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
              onClick={handleClose}
            >
              View video →
            </Link>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={handleClose}
          className="shrink-0 text-text-faint hover:text-text-muted transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div className="overflow-hidden rounded-b-xl">
        <div
          className="h-0.5 bg-brand-500 animate-[shrink_5s_linear_forwards]"
          style={{
            animationDelay: "10ms",
          }}
        />
      </div>
    </div>
  );
}