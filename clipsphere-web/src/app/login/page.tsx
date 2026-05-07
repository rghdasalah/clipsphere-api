"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AxiosError } from "axios";

function getRedirectTarget(): string {
  if (typeof window === "undefined") return "/";
  const from = new URLSearchParams(window.location.search).get("from");
  if (!from || !from.startsWith("/")) return "/";
  if (from === "/login" || from === "/register") return "/";
  return from;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigatedRef = useRef(false);

  // Single navigation point — fires the moment isAuthenticated flips to true.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (navigatedRef.current) return;
    navigatedRef.current = true;

    const target = getRedirectTarget();

    // Soft navigation: keeps React state alive across the route change so
    // the AuthProvider context survives intact and the navbar updates
    // immediately. NOTE: replace() so /login isn't in the history.
    router.replace(target);

    // Safety net: if the soft navigation didn't take effect within 500ms
    // (e.g. an unrelated render error in the target route), force a hard
    // reload. The localStorage cache will keep the user logged in.
    const fallback = window.setTimeout(() => {
      if (window.location.pathname.startsWith("/login")) {
        window.location.href = target;
      }
    }, 500);

    return () => window.clearTimeout(fallback);
  }, [authLoading, isAuthenticated, router]);

  function validate(): string | null {
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
    if (!password) return "Password is required";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      // The useEffect above will navigate as soon as isAuthenticated flips.
      // Keep the button locked briefly so the user sees feedback, then unlock
      // as a safety net in case navigation is delayed for any reason.
      window.setTimeout(() => setIsSubmitting(false), 1500);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ||
          axiosErr.message ||
          "Invalid credentials"
      );
      setIsSubmitting(false);
    }
  }

  // While the auth state is still booting, render nothing (avoids a flash
  // of the form for already-logged-in users hitting /login).
  if (authLoading) return null;
  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-4 bg-gradient-to-br from-brand-500/5 via-transparent to-violet-500/5">
      <div className="glass glow-accent w-full max-w-md rounded-2xl p-8 animate-fade-in-up">
        <h1 className="mb-6 text-center font-display text-2xl font-bold text-text-strong">
          Sign in to ClipSphere
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-text-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm text-text-strong placeholder-text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-text-muted"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm text-text-strong placeholder-text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 focus:ring-2 focus:ring-brand-500/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-brand-400 hover:text-brand-300"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}