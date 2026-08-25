"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Clock, User, Shield } from "lucide-react";
import { api } from "@/lib/api";

export default function SuperadminActivityPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["superadmin-activity"],
    queryFn: () => api<any[]>("/api/superadmin/activity"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">System Audit Log & Activity Stream</h1>
        <p className="text-xs text-slate-400">Chronological trail of administrative, platform, and critical business actions</p>
      </div>

      {!logs?.length ? (
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-8 text-center text-xs text-slate-400">
          No audit log events recorded yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
          <div className="divide-y divide-[#1e293b]">
            {logs.map((log) => (
              <div key={log.id} className="p-4 text-xs space-y-1 hover:bg-[#1e293b]/40 transition-colors">
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#5865f2]/20 px-2 py-0.5 text-[10px] font-bold text-[#5865f2] border border-[#5865f2]/30 uppercase">
                      {log.action}
                    </span>
                    <span className="text-slate-300 font-medium">{log.userName || log.userId || "System"}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.details && <p className="text-slate-400 text-[11px] pl-1">{log.details}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
