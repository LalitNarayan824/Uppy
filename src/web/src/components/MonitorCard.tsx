"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Check, type Monitor } from "@/lib/api";
import EditMonitorForm from "./EditMonitorForm";

function ledColor(status: "up" | "down" | "pending") {
  if (status === "up") return "#16a34a";
  if (status === "down") return "#dc2626";
  return "#9ca3af";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MonitorCard({
  monitor,
  onChanged,
}: {
  monitor: Monitor;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<"up" | "down" | "pending">("pending");
  const [uptime, setUptime] = useState<number | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<Check[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [uptimeStats, checks] = await Promise.all([
          api.monitors.uptime(monitor.id),
          api.monitors.checks(monitor.id, 60),
        ]);
        if (cancelled) return;
        const last = checks[0];
        setStatus(last ? (last.isFailure ? "down" : "up") : "pending");
        setLastCheckedAt(last?.checkedAt ?? null);
        setUptime(uptimeStats[0]?.uptimePercent ?? null);
        setHistory([...checks].reverse());
      } catch {
        if (!cancelled) setStatus("pending");
      }
    }

    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [monitor.id]);

  async function handleDelete() {
    if (!confirm(`Delete monitor "${monitor.name}"?`)) return;
    try {
      await api.monitors.delete(monitor.id);
      onChanged();
    } catch {
      alert("Failed to delete monitor");
    }
  }

  const color = ledColor(status);
  const glow = `0 0 0 3px ${color}26, 0 0 8px ${color}59`;

  return (
    <div className="px-4 py-3 transition-colors hover:bg-paper/60">
      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: color, boxShadow: glow }}
            title={status}
          />
          <Link href={`/monitors/${monitor.id}`} className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-ink hover:text-accent">
              {monitor.name}
            </div>
            <div className="truncate font-mono text-[11px] text-muted">{monitor.url}</div>
          </Link>
          <div
            className="hidden items-center gap-[2px] sm:flex"
            title="Last 60 checks (left = oldest)"
          >
            {history.length === 0 ? (
              <span className="font-mono text-[10px] text-faint">NO DATA</span>
            ) : (
              history.map((c) => (
                <span
                  key={c.id}
                  className={`h-4 w-[3px] rounded-[1px] ${c.isFailure ? "bg-down" : "bg-up"}`}
                />
              ))
            )}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="w-16 text-right">
            <div className="font-display text-lg font-semibold leading-none text-ink">
              {uptime !== null ? `${uptime.toFixed(2)}%` : "—"}
            </div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-faint">
              uptime
            </div>
          </div>
          <div className="w-14 text-right">
            <div className="font-mono text-[11px] text-muted">
              {lastCheckedAt ? relativeTime(lastCheckedAt) : "—"}
            </div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-faint">
              checked
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:text-accent"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:text-down"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      {editing && (
        <EditMonitorForm
          monitor={monitor}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}