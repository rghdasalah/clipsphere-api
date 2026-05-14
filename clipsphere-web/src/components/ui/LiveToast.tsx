"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

interface LiveToastProps {
  kind: "like" | "tip" | "review";
  primaryText: string;
  secondaryText?: string;
  href?: string;
  onClose: () => void;
}

const ICON: Record<LiveToastProps["kind"], string> = {
  like: "♥",
  tip: "💸",
  review: "⭐",
};

const HEADER: Record<LiveToastProps["kind"], string> = {
  like: "New Like!",
  tip: "New Tip!",
  review: "New Review!",
};

export default function LiveToast({
  kind,
  primaryText,
  secondaryText,
  href,
  onClose,
}: LiveToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-brand-500 text-sm">
          {ICON[kind]}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-strong">{HEADER[kind]}</p>
          <p className="mt-0.5 text-xs text-text-muted">{primaryText}</p>
          {secondaryText && (
            <p className="mt-0.5 text-[11px] text-text-faint truncate">
              {secondaryText}
            </p>
          )}
          {href && (
            <Link
              href={href}
              onClick={handleClose}
              className="mt-1.5 inline-block text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
            >
              Open →
            </Link>
          )}
        </div>

        <button
          onClick={handleClose}
          className="shrink-0 text-text-faint hover:text-text-muted transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <div className="overflow-hidden rounded-b-xl">
        <div
          className="h-0.5 bg-brand-500 animate-[shrink_5s_linear_forwards]"
          style={{ animationDelay: "10ms" }}
        />
      </div>
    </div>
  );
}