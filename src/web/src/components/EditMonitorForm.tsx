"use client";

import { useState } from "react";
import { api, type Monitor } from "@/lib/api";

export default function EditMonitorForm({
  monitor,
  onSaved,
  onCancel,
}: {
  monitor: Monitor;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !url.trim()) {
      setError("Name and URL are required");
      return;
    }
    setSaving(true);
    try {
      await api.monitors.update(monitor.id, name.trim(), url.trim());
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update monitor");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        aria-label="Monitor name"
        className="w-40 rounded-md border border-line bg-white px-3 py-1.5 text-ink placeholder-faint"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        aria-label="Monitor URL"
        className="w-60 rounded-md border border-line bg-white px-3 py-1.5 font-mono text-[13px] text-ink placeholder-faint"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-ink"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-down">{error}</span>}
    </form>
  );
}