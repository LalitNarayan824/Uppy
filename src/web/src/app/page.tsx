"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken, type Check, type Monitor } from "@/lib/api";
import AddMonitorForm from "@/components/AddMonitorForm";
import MonitorCard from "@/components/MonitorCard";

export default function Dashboard() {
  const router = useRouter();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [email, setEmail] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [downIds, setDownIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const [list, me] = await Promise.all([api.monitors.list(), api.auth.me()]);
        if (cancelled) return;
        setMonitors(list);
        setEmail(me.email);
        setLoaded(true);

        const latest = await Promise.all(list.map((m) => api.monitors.checks(m.id, 1)));
        if (cancelled) return;
        setDownIds(
          new Set(
            list.filter((_, i) => latest[i][0]?.isFailure).map((m) => m.id)
          )
        );
      } catch {
        /* handled globally */
      }
    }

    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [router]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  if (!getToken()) return null;

  const downCount = downIds.size;
  const operational = loaded && monitors.length > 0 && downCount === 0;
  const green = operational;
  const bannerColor = green ? "#16a34a" : downCount > 0 ? "#dc2626" : "#1d4ed8";
  const bannerText = green
    ? "All systems operational"
    : downCount > 0
      ? `${downCount} ${downCount === 1 ? "system" : "systems"} down`
      : "No monitors";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="flex items-center justify-between pb-5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-bold uppercase tracking-[0.2em] text-ink">
            Uppy
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
            uptime monitoring
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-muted">{email}</span>
          <button
            onClick={logout}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:text-ink"
          >
            Log out
          </button>
        </div>
      </header>

      {loaded && monitors.length > 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-5 py-4"
          style={{ borderColor: `${bannerColor}40`, background: `${bannerColor}0d` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 animate-led rounded-full"
              style={{ background: bannerColor, boxShadow: `0 0 0 3px ${bannerColor}26` }}
            />
            <span
              className="font-display text-base font-semibold uppercase tracking-[0.12em]"
              style={{ color: bannerColor }}
            >
              {bannerText}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
            <span>{monitors.length} monitored</span>
            <span className="text-faint">·</span>
            <span className={downCount > 0 ? "text-down" : ""}>
              {downCount} down
            </span>
            <span className="text-faint">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[9px] uppercase tracking-widest text-muted">
              <span className="h-1.5 w-1.5 animate-led rounded-full bg-accent" />
              Live
            </span>
          </div>
        </div>
      )}

      <div className="mt-5">
        <AddMonitorForm onAdded={() => api.monitors.list().then(setMonitors)} />
      </div>

      <div className="mt-5">
        {loaded && monitors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
            <div className="font-display text-lg font-semibold text-ink">No monitors yet</div>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Add your first monitor above to start watching your services. You&apos;ll get a
              Discord or email alert the moment something goes down.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
            <div className="flex items-center gap-4 border-b border-line bg-paper/60 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
              <span className="flex-1">Monitor</span>
              <span className="hidden w-16 text-right sm:block">24h uptime</span>
              <span className="hidden w-14 text-right sm:block">Checked</span>
              <span className="w-16 sm:w-24 text-right">Actions</span>
            </div>
            <div className="divide-y divide-line">
              {monitors.map((m) => (
                <MonitorCard key={m.id} monitor={m} onChanged={() => api.monitors.list().then(setMonitors)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}