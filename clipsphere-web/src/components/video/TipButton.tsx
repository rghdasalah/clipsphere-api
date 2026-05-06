"use client";

import { useState } from "react";
import api from "@/services/api";

const TIP_AMOUNTS = [
  { label: "$1", cents: 100 },
  { label: "$5", cents: 500 },
  { label: "$10", cents: 1000 },
];

interface TipButtonProps {
  creatorId: string;
  creatorUsername: string;
}

export default function TipButton({ creatorId, creatorUsername }: TipButtonProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTip = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/tips/checkout", {
        creatorId,
        amount: selected,
      });
      window.location.href = data.data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <p className="text-sm font-semibold text-text-strong">
        Support{" "}
        <span className="text-brand-400">{creatorUsername}</span>
      </p>

      <div className="flex gap-2">
        {TIP_AMOUNTS.map(({ label, cents }) => (
          <button
            key={cents}
            onClick={() => setSelected(cents)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selected === cents
                ? "bg-brand-500 text-white"
                : "bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <button
        onClick={handleTip}
        disabled={!selected || loading}
        className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Redirecting to Stripe…" : "Send Tip"}
      </button>

      <p className="text-[10px] text-text-faint text-center">
        Powered by Stripe · Test mode
      </p>
    </div>
  );
}