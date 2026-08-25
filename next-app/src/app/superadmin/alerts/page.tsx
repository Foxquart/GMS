"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export default function SuperadminAlertsPage() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["superadmin-alerts"],
    queryFn: () => api<any[]>("/api/superadmin/alerts"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Smart System & Database Alerts</h1>
        <p className="text-xs text-slate-400">Rule-based deterministic warnings and operational notifications</p>
      </div>

      {!alerts?.length ? (
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-8 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#4ade80]" />
          <h2 className="text-sm font-bold text-white">No Active Alerts</h2>
          <p className="text-xs text-slate-400">Database latency and connection parameters are within normal thresholds.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{alert.condition}</span>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40 uppercase">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    Threshold: {alert.threshold} | Current: {alert.currentValue}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    First Detected: {new Date(alert.firstDetectedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                {alert.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
