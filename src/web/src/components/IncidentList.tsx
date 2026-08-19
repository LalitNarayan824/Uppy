"use client";

import { useEffect, useState } from "react";
import { api, type Incident } from "@/lib/api";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(startedAt: string, resolvedAt: string | null): string {
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const mins = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export default function IncidentList({ monitorId }: { monitorId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const data = await api.monitors.incidents(monitorId, 50);
        if (!cancelled) setIncidents(data);
      } catch {
        /* auth errors handled globally */
      }
    }

    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [monitorId]);

  if (incidents.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        No incidents recorded — this monitor has been quiet.
      </p>
    );
  }

  return (
    <ul>
      {incidents.map((incident) => {
        const open = !incident.resolvedAt;
        return (
          <li key={incident.id} className="relative pb-7 pl-7 last:pb-1">
            <span className="absolute left-[5px] top-[9px] bottom-[9px] w-px bg-line" />
            <span
              className="absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full bg-down"
              style={{ boxShadow: "0 0 0 3px #dc262626, 0 0 8px #dc262659" }}
            />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-down">
                Down
              </span>
              <span className="font-mono text-[11px] text-muted">{fmt(incident.startedAt)}</span>
            </div>
            {incident.cause && (
              <div className="mt-0.5 font-mono text-[11px] text-muted">{incident.cause}</div>
            )}
            <div className="mt-2">
              {open ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-down/30 bg-down/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-down">
                  <span className="h-1.5 w-1.5 animate-led rounded-full bg-down" />
                  Ongoing — {fmtDuration(incident.startedAt, null)}
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="rounded-full border border-up/30 bg-up/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-up">
                    Resolved — {fmtDuration(incident.startedAt, incident.resolvedAt)}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {fmt(incident.resolvedAt)}
                  </span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}