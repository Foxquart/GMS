"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Database, Server, Clock, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

export default function SuperadminHealthPage() {
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["superadmin-health-detail"],
    queryFn: () => api<any>("/api/superadmin/health"),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">System & Database Health Checks</h1>
          <p className="text-xs text-slate-400">Detailed latency and operational responsiveness benchmarks</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#334155] transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
          <span>{isRefetching ? "Testing..." : "Run Health Benchmark"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">PostgreSQL Connection & Query Latency</h2>
              <p className="text-xs text-slate-400">Database ping & query benchmark</p>
            </div>
          </div>
          <div className="space-y-3 pt-2 text-xs">
            <div className="flex justify-between border-b border-[#1e293b] pb-2">
              <span className="text-slate-400">Status</span>
              <span className="font-bold text-[#4ade80]">{data?.database?.status || "HEALTHY"}</span>
            </div>
            <div className="flex justify-between border-b border-[#1e293b] pb-2">
              <span className="text-slate-400">Measured Latency</span>
              <span className="font-bold text-white">{data?.database?.latencyMs ?? 0} ms</span>
            </div>
            <div className="flex justify-between border-b border-[#1e293b] pb-2">
              <span className="text-slate-400">Threshold Limit</span>
              <span className="font-bold text-amber-400">500 ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Diagnostic Notes</span>
              <span className="text-slate-300">{data?.database?.details}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865f2]/10 text-[#5865f2]">
              <Server size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Next.js API Handler Health</h2>
              <p className="text-xs text-slate-400">HTTP Route Handler response metrics</p>
            </div>
          </div>
          <div className="space-y-3 pt-2 text-xs">
            <div className="flex justify-between border-b border-[#1e293b] pb-2">
              <span className="text-slate-400">Status</span>
              <span className="font-bold text-[#4ade80]">{data?.api?.status || "HEALTHY"}</span>
            </div>
            <div className="flex justify-between border-b border-[#1e293b] pb-2">
              <span className="text-slate-400">Internal Latency</span>
              <span className="font-bold text-white">{data?.api?.latencyMs ?? 0} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Diagnostic Notes</span>
              <span className="text-slate-300">{data?.api?.details}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
