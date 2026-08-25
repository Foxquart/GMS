"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Activity,
  AlertTriangle,
  Users,
  FileText,
  Server,
  LogOut,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/superadmin", label: "Overview", icon: Shield },
  { href: "/superadmin/health", label: "Health", icon: Activity },
  { href: "/superadmin/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/superadmin/admins", label: "Admins", icon: Users },
  { href: "/superadmin/activity", label: "Activity", icon: FileText },
  { href: "/superadmin/system", label: "System Info", icon: Server },
];

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ userId: string; email: string; role: string }>("/api/auth/me"),
  });

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a] text-white">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 animate-pulse text-[#5865f2]" />
          <span className="text-sm font-semibold">Loading Developer Control Plane...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (user.role?.toUpperCase() !== "SUPERADMIN") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0f172a] text-white p-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Access Denied</h1>
        <p className="text-sm text-slate-400 mb-6 text-center max-w-md">
          Developer Superadmin control plane requires SUPERADMIN role permissions. Your account ({user.email}) is configured as {user.role}.
        </p>
        <Link href="/dashboard" className="rounded-xl bg-[#5865f2] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#4752c4]">
          Return to Garage Workshop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc]">
      {/* Top Control Bar */}
      <header className="sticky top-0 z-50 border-b border-[#1e293b] bg-[#0f172a]/95 backdrop-blur-md px-4 md:px-8 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5865f2] text-white shadow-lg shadow-[#5865f2]/25">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wide text-white">Superadmin Control Plane</span>
                <span className="rounded-full bg-[#16a34a]/20 px-2 py-0.5 text-[10px] font-bold text-[#4ade80] border border-[#16a34a]/30">
                  Platform Operator
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Observability & Admin Access Control</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-[#334155] bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#334155] hover:text-white transition-all"
            >
              <ArrowLeft size={14} />
              <span>Garage Workshop</span>
            </Link>
            <div className="h-6 w-[1px] bg-[#334155] hidden md:block" />
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{user?.email}</p>
              <p className="text-[10px] text-[#4ade80]">SUPERADMIN</p>
            </div>
            <button
              onClick={logout}
              className="rounded-xl border border-[#334155] bg-[#1e293b] p-2 text-slate-400 hover:bg-[#ef4444]/20 hover:text-[#ef4444] transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Control Plane Navigation Tabs */}
      <div className="border-b border-[#1e293b] bg-[#0f172a]/60 px-4 md:px-8 py-2">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/superadmin" ? pathname === "/superadmin" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap",
                  active
                    ? "bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/20"
                    : "text-slate-400 hover:bg-[#1e293b] hover:text-white",
                )}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
    </div>
  );
}
