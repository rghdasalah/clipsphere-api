import Link from "next/link";

export default function TipSuccessPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-success/30 bg-surface-2/80 p-8 text-center backdrop-blur-xl">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="font-display text-xl font-bold text-text-strong">
          Tip Sent!
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Your support means everything to the creator. They&apos;ll love you for this!
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-400 transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </div>
  );
}