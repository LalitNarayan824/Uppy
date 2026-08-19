"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Check, type Monitor, type UptimeStat } from "@/lib/api";
import ResponseTimeChart from "./ResponseTimeChart";
import IncidentList from "./IncidentList";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MonitorDetail({ id }: { id: string }) {
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [uptime, setUptime] = useState<UptimeStat[]>([]);
  const [status, setStatus] = useState<"up" | "down" | "pending">("pending");
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [m, u, checks] = await Promise.all([
          api.monitors.get(id),
          api.monitors.uptime(id),
          api.monitors.checks(id, 1),
        ]);
        if (!cancelled) {
          setMonitor(m);
          setUptime(u);
          const last: Check | undefined = checks[0];
          setStatus(last ? (last.isFailure ? "down" : "up") : "pending");
          setLastCheckedAt(last?.checkedAt ?? null);
        }
      } catch (err) {
        if (!cancelled && err instanceof Error && err.message === "Unauthorized") return;
        if (!cancelled) setNotFound(true);
      }
    }

    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted">This monitor doesn&apos;t exist or is no longer yours.</p>
        <Link
          href="/"
          className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const statusColor = status === "up" ? "#16a34a" : status === "down" ? "#dc2626" : "#9ca3af";
  const statusLabel =
    status === "up" ? "Operational" : status === "down" ? "Down" : "Pending";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link
        href="/"
        className="font-mono text-[11px] uppercase tracking-widest text-faint hover:text-accent"
      >
        ← Back to dashboard
      </Link>

      {monitor ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {monitor.name}
            </h1>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{
                borderColor: `${statusColor}40`,
                background: `${statusColor}12`,
                color: statusColor,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: statusColor,
                  boxShadow: `0 0 0 2px ${statusColor}26`,
                  ...(status === "down" ? { animation: "led-pulse 2s ease-in-out infinite" } : {}),
                }}
              />
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 break-all font-mono text-xs text-muted">{monitor.url}</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {uptime.map((stat) => {
              const pct = stat.uptimePercent;
              const ok = stat.totalChecks - stat.failedChecks;
              return (
                <div
                  key={stat.period}
                  className="rounded-lg border border-line bg-surface p-5 shadow-sm"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                    Uptime · {stat.period}
                  </div>
                  <div
                    className={`mt-2 font-display text-3xl font-semibold leading-none ${
                      pct >= 99.9 ? "text-up" : pct < 99 ? "text-down" : "text-ink"
                    }`}
                  >
                    {pct.toFixed(2)}%
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-muted">
                    {ok}/{stat.totalChecks} checks ok
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-paper">
                    <div
                      className={`h-full rounded-full ${pct >= 99.9 ? "bg-up" : pct < 99 ? "bg-down" : "bg-accent"}`}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-ink">
                Response time
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
                Last 100 checks
              </span>
            </div>
            <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <ResponseTimeChart monitorId={id} />
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-ink">
                Incidents
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
                {lastCheckedAt ? `Last checked ${relativeTime(lastCheckedAt)}` : ""}
              </span>
            </div>
            <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
              <IncidentList monitorId={id} />
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-8 font-mono text-xs text-muted">Loading…</p>
      )}
    </div>
  );
}