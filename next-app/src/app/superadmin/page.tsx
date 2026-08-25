"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Activity,
  AlertTriangle,
  Users,
  Database,
  Server,
  Clock,
  CheckCircle,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";

export default function SuperadminOverviewPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["superadmin-health"],
    queryFn: () => api<any>("/api/superadmin/health"),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-[#1e293b]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#1e293b]" />
          ))}
        </div>
      </div>
    );
  }

  const overview = data?.overview ?? {};

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">System Overview & Operational Health</h1>
          <p className="text-xs text-slate-400">Real-time status of application infrastructure, database, and admin activity</p>
        </div>
        <button
          onClick={() => refetch()}
          className="self-start rounded-xl border border-[#334155] bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#334155] hover:text-white transition-all"
        >
          Refresh Health Checks
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Status</span>
            <CheckCircle className="h-5 w-5 text-[#4ade80]" />
          </div>
          <p className="text-xl font-extrabold text-white">{overview.systemStatus || "HEALTHY"}</p>
          <p className="text-[11px] text-slate-400">All services responding normally</p>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database Latency</span>
            <Database className="h-5 w-5 text-[#5865f2]" />
          </div>
          <p className="text-xl font-extrabold text-white">{overview.dbLatencyMs || 0} ms</p>
          <p className="text-[11px] text-[#4ade80]">Status: {overview.dbStatus || "HEALTHY"}</p>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Admins</span>
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-xl font-extrabold text-white">{overview.activeAdmins || 0}</p>
          <p className="text-[11px] text-slate-400">Garage Operators</p>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Alerts</span>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-xl font-extrabold text-white">{overview.openAlertsCount || 0}</p>
          <p className="text-[11px] text-slate-400">System Warnings</p>
        </div>
      </div>

      {/* Operational Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* System Health Check Details */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#5865f2]" />
            Component Health Checks
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-[#1e293b] bg-[#1e293b]/50 p-3">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">PostgreSQL Database</p>
                  <p className="text-[11px] text-slate-400">{data?.database?.details}</p>
                </div>
              </div>
              <span className="rounded-full bg-[#16a34a]/20 px-2.5 py-1 text-[11px] font-bold text-[#4ade80] border border-[#16a34a]/30">
                {data?.database?.latencyMs} ms
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#1e293b] bg-[#1e293b]/50 p-3">
              <div className="flex items-center gap-2.5">
                <Server className="h-4 w-4 text-[#5865f2]" />
                <div>
                  <p className="font-semibold text-white">Next.js API Handlers</p>
                  <p className="text-[11px] text-slate-400">{data?.api?.details}</p>
                </div>
              </div>
              <span className="rounded-full bg-[#16a34a]/20 px-2.5 py-1 text-[11px] font-bold text-[#4ade80] border border-[#16a34a]/30">
                {data?.api?.latencyMs} ms
              </span>
            </div>
          </div>
        </div>

        {/* Audit Activity Stream */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#5865f2]" />
            Recent Activity Log
          </h2>
          {!overview.recentAudit?.length ? (
            <p className="text-xs text-slate-400 p-4 text-center">No recent audit log events recorded</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {overview.recentAudit.map((log: any) => (
                <div key={log.id} className="rounded-xl border border-[#1e293b] bg-[#1e293b]/40 p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-[#5865f2]">{log.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{log.details || log.userName || "System Action"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
