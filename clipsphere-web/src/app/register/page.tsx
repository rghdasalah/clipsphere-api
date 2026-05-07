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

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (navigatedRef.current) return;
    navigatedRef.current = true;

    const target = getRedirectTarget();
    router.replace(target);

    const fallback = window.setTimeout(() => {
      if (window.location.pathname.startsWith("/register")) {
        window.location.href = target;
      }
    }, 500);

    return () => window.clearTimeout(fallback);
  }, [authLoading, isAuthenticated, router]);

  function validate(): string | null {
    if (username.trim().length < 3) return "Username must be at least 3 characters";
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password !== confirmPassword) return "Passwords do not match";
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
      await register(username.trim(), email.trim(), password);
      window.setTimeout(() => setIsSubmitting(false), 1500);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ||
          axiosErr.message ||
          "Registration failed. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  if (authLoading) return null;
  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-4 bg-gradient-to-br from-brand-500/5 via-transparent to-violet-500/5">
      <div className="glass glow-accent w-full max-w-md rounded-2xl p-8 animate-fade-in-up">
        <h1 className="mb-6 text-center font-display text-2xl font-bold text-text-strong">
          Create your account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-text-muted"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm text-text-strong placeholder-text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              placeholder="johndoe"
              autoComplete="username"
              disabled={isSubmitting}
            />
          </div>

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
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-text-muted"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm text-text-strong placeholder-text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 focus:ring-2 focus:ring-brand-500/30 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-400 hover:text-brand-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}