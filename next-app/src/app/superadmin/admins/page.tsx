"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, UserPlus, Shield, Power, Trash2, Key } from "lucide-react";
import { api } from "@/lib/api";

export default function SuperadminAdminsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data: admins, isLoading } = useQuery({
    queryKey: ["superadmin-admins"],
    queryFn: () => api<any[]>("/api/superadmin/admins"),
  });

  const createAdmin = useMutation({
    mutationFn: () =>
      api("/api/superadmin/admins", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role: "ADMIN" }),
      }),
    onSuccess: () => {
      toast.success("New Garage Admin account created");
      setShowCreate(false);
      setName("");
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["superadmin-admins"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/api/superadmin/admins/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      toast.success("Admin account status updated");
      qc.invalidateQueries({ queryKey: ["superadmin-admins"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAdmin = useMutation({
    mutationFn: (id: string) =>
      api(`/api/superadmin/admins/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Admin account deleted");
      qc.invalidateQueries({ queryKey: ["superadmin-admins"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Garage Admin Management</h1>
          <p className="text-xs text-slate-400">Control garage operator user accounts and access credentials</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-[#5865f2] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#4752c4] transition-all shadow-lg shadow-[#5865f2]/20"
        >
          <UserPlus size={16} />
          <span>Create New Admin</span>
        </button>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-[#5865f2]/30 bg-[#0f172a] p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Create Garage Admin Account</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Operator Name"
                className="w-full rounded-xl border border-[#334155] bg-[#1e293b] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#5865f2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@garage.com"
                className="w-full rounded-xl border border-[#334155] bg-[#1e293b] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#5865f2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-[#334155] bg-[#1e293b] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#5865f2] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#334155]"
            >
              Cancel
            </button>
            <button
              onClick={() => createAdmin.mutate()}
              disabled={!name || !email || !password || createAdmin.isPending}
              className="rounded-xl bg-[#5865f2] px-4 py-2 text-xs font-bold text-white hover:bg-[#4752c4] disabled:opacity-50"
            >
              {createAdmin.isPending ? "Creating..." : "Save Admin User"}
            </button>
          </div>
        </div>
      )}

      {/* Admin List */}
      <div className="space-y-3">
        {(admins ?? []).map((admin) => (
          <div
            key={admin.id}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865f2]/10 text-[#5865f2] font-bold">
                {admin.email[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm">{admin.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      admin.role.toUpperCase() === "SUPERADMIN"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        : "bg-[#5865f2]/20 text-[#5865f2] border-[#5865f2]/30"
                    }`}
                  >
                    {admin.role}
                  </span>
                </div>
                <p className="text-slate-400">{admin.email}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Last Login: {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : "Never"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => toggleStatus.mutate({ id: admin.id, isActive: !admin.isActive })}
                disabled={admin.role.toUpperCase() === "SUPERADMIN"}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition-all ${
                  admin.isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-[#4ade80] hover:bg-emerald-500/20"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                } disabled:opacity-40`}
              >
                <Power size={14} />
                <span>{admin.isActive ? "Active (Disable)" : "Disabled (Enable)"}</span>
              </button>

              {admin.role.toUpperCase() !== "SUPERADMIN" && (
                <button
                  onClick={() => {
                    if (confirm(`Delete admin account ${admin.email}?`)) {
                      deleteAdmin.mutate(admin.id);
                    }
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition-all"
                  title="Delete Admin"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
