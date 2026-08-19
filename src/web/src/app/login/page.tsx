"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.auth.login(email, password);
      setToken(res.token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <span className="font-display text-xl font-bold uppercase tracking-[0.2em] text-ink">
            Uppy
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </div>
        <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          Sign in
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-[13px] font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-ink placeholder-faint"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-[13px] font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-ink placeholder-faint"
            />
          </div>
          {error && (
            <p className="rounded-md border border-down/30 bg-down/[0.06] px-3 py-2 text-[13px] text-down">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-muted">
          No account?{" "}
          <Link href="/register" className="font-medium text-accent hover:text-accent-strong">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}