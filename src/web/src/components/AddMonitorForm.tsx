"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function AddMonitorForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !url.trim()) {
      setError("Name and URL are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.monitors.create(name.trim(), url.trim());
      setName("");
      setUrl("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add monitor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-line bg-surface p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          New monitor
        </span>
        {error && <span className="text-xs text-down">{error}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name — e.g. API server"
          aria-label="Monitor name"
          className="w-44 rounded-md border border-line bg-white px-3 py-2 text-ink placeholder-faint"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          aria-label="Monitor URL"
          className="w-64 rounded-md border border-line bg-white px-3 py-2 font-mono text-[13px] text-ink placeholder-faint"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
        >
          {submitting ? "Adding..." : "+ Add monitor"}
        </button>
      </div>
    </form>
  );
}