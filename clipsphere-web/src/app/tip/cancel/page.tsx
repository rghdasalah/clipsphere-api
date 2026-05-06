import Link from "next/link";

export default function TipCancelPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-2/80 p-8 text-center backdrop-blur-xl">
        <div className="mb-4 text-5xl">💔</div>
        <h1 className="font-display text-xl font-bold text-text-strong">
          Tip Cancelled
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          No worries! You can always support this creator another time.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-surface-3 px-6 py-2.5 text-sm font-medium text-text hover:bg-surface-2 transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </div>
  );
}