"use client";

import { useQuery } from "@tanstack/react-query";
import { Server, Code, HardDrive, Cpu, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function SuperadminSystemPage() {
  const { data: sysInfo } = useQuery({
    queryKey: ["superadmin-system"],
    queryFn: () => api<any>("/api/superadmin/system"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">System Information & Runtime Environment</h1>
        <p className="text-xs text-slate-400">Technical deployment parameters and framework runtime configuration</p>
      </div>

      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 space-y-4 text-xs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-[#1e293b] bg-[#1e293b]/50 p-4">
            <Code className="h-6 w-6 text-[#5865f2]" />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Application Version</p>
              <p className="text-base font-bold text-white">{sysInfo?.appVersion || "1.1.0"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#1e293b] bg-[#1e293b]/50 p-4">
            <Server className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Environment</p>
              <p className="text-base font-bold text-white capitalize">{sysInfo?.environment || "production"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#1e293b] bg-[#1e293b]/50 p-4">
            <Cpu className="h-6 w-6 text-purple-400" />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Next.js Framework</p>
              <p className="text-base font-bold text-white">{sysInfo?.nextVersion || "v16.3.1 (Turbopack)"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#1e293b] bg-[#1e293b]/50 p-4">
            <HardDrive className="h-6 w-6 text-amber-400" />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Database Driver</p>
              <p className="text-base font-bold text-white">
                {sysInfo?.usePglite ? "Embedded PGlite (Dev)" : "Managed PostgreSQL (Node-Postgres)"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
