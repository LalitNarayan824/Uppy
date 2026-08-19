"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { api, type Check } from "@/lib/api";

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ResponseTimeChart({ monitorId }: { monitorId: string }) {
  const [checks, setChecks] = useState<Check[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const data = await api.monitors.checks(monitorId, 100);
        if (!cancelled) setChecks(data);
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

  const data = checks
    .map((c) => ({
      time: fmtTime(c.checkedAt),
      full: new Date(c.checkedAt).toLocaleString(),
      ms: c.isFailure ? null : c.responseTimeMs,
      failure: c.isFailure ? c.responseTimeMs ?? 0 : null,
    }))
    .reverse();

  if (checks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No checks yet — waiting for the next cycle.
      </p>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="respFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e3e7ec" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "#8b96a3" }}
            axisLine={{ stroke: "#e3e7ec" }}
            tickLine={false}
            minTickGap={50}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8b96a3" }}
            axisLine={{ stroke: "#e3e7ec" }}
            tickLine={false}
            width={56}
            tickFormatter={(v: number) => `${v}ms`}
          />
          <Tooltip
            labelFormatter={(_, payload) =>
              (payload?.[0]?.payload as { full: string } | undefined)?.full ?? ""
            }
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e3e7ec",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(16,21,28,0.08)",
              fontSize: 12,
            }}
            labelStyle={{ color: "#5c6773", fontWeight: 600 }}
            itemStyle={{ color: "#10151c" }}
          />
          <Area
            type="monotone"
            dataKey="ms"
            name="Response time"
            stroke="#1d4ed8"
            strokeWidth={2}
            fill="url(#respFill)"
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4, fill: "#1d4ed8", strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="failure"
            name="Failure"
            stroke="#dc2626"
            dot={{ r: 3.5, fill: "#dc2626", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#dc2626", strokeWidth: 0 }}
            strokeWidth={0}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}