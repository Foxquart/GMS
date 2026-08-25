"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Wrench,
  Package,
  Users,
  Settings,
  LogOut,
  Plus,
  MoreHorizontal,
  FileText,
  BarChart3,
  Shield,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

const DESKTOP_CHANNELS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_PRIMARY = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/inventory", label: "Inventory", icon: Package },
];

export function AppNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ userId: string; email: string; role: string }>("/api/auth/me"),
  });

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isSuperadmin = user?.role?.toUpperCase() === "SUPERADMIN";

  return (
    <div suppressHydrationWarning>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#e2e8f0] bg-white md:flex">
        {/* Server Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#e2e8f0] bg-white px-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/25 font-bold">
              <Wrench size={19} />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wide text-[#0f172a]">Garage Manager</span>
              <p className="text-[10px] font-medium text-[#64748b]">Digital Workshop</p>
            </div>
          </div>
        </div>

        {/* Channels List */}
        <nav className="flex-1 space-y-4 px-2 py-3 overflow-y-auto">
          <div className="space-y-0.5">
            {DESKTOP_CHANNELS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 cursor-pointer select-none",
                    active
                      ? "bg-[#5865f2]/10 text-[#4752c4] font-semibold"
                      : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]",
                  )}
                >
                  <div
                    className={cn(
                      "absolute -left-2 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#5865f2] transition-all duration-200",
                      active ? "h-5 opacity-100" : "h-0 opacity-0 group-hover:h-2 group-hover:opacity-60",
                    )}
                  />
                  <Icon size={18} className={cn(active ? "text-[#5865f2]" : "text-[#94a3b8] group-hover:text-[#0f172a]")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {isSuperadmin && (
              <Link
                href="/superadmin"
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 cursor-pointer select-none border border-[#5865f2]/20 mt-4 bg-[#5865f2]/5",
                  isActive("/superadmin")
                    ? "bg-[#5865f2]/15 text-[#4752c4] font-semibold"
                    : "text-[#5865f2] hover:bg-[#5865f2]/10",
                )}
              >
                <Shield size={18} className="text-[#5865f2]" />
                <span>Superadmin Control</span>
              </Link>
            )}
          </div>
        </nav>

        {/* User Card Footer */}
        <div className="border-t border-[#e2e8f0] bg-[#f8fafc] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white">
              {user?.email ? user.email[0].toUpperCase() : "G"}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#0f172a] truncate">
                {user?.email ? user.email.split("@")[0] : "Garage Admin"}
              </p>
              <p className="text-[10px] text-[#64748b] capitalize">{user?.role || "ADMIN"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded p-1 text-[#64748b] hover:bg-[#eef0f3] hover:text-[#0f172a] transition-colors"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation: Dashboard | Jobs | Inventory | More */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#e2e8f0] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {MOBILE_PRIMARY.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold tracking-tight transition-colors",
                active ? "text-[#5865f2]" : "text-[#94a3b8] hover:text-[#0f172a]",
              )}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setShowMore(!showMore)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold tracking-tight transition-colors",
            showMore || ["/customers", "/invoices", "/settings", "/superadmin"].some((p) => pathname.startsWith(p))
              ? "text-[#5865f2]"
              : "text-[#94a3b8] hover:text-[#0f172a]",
          )}
        >
          <MoreHorizontal size={19} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" Bottom Sheet Drawer */}
      {showMore && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm md:hidden">
          <div className="rounded-t-2xl bg-white p-4 shadow-2xl border-t border-[#e2e8f0] space-y-3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
              <span className="text-sm font-bold text-[#0f172a]">More Options</span>
              <button
                onClick={() => setShowMore(false)}
                className="rounded-full p-1 text-[#64748b] hover:bg-[#f1f5f9]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/customers"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-semibold text-[#0f172a] hover:bg-[#f1f5f9]"
              >
                <Users size={18} className="text-[#5865f2]" />
                <span>Customers</span>
              </Link>
              <Link
                href="/invoices"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-semibold text-[#0f172a] hover:bg-[#f1f5f9]"
              >
                <FileText size={18} className="text-[#5865f2]" />
                <span>Invoices</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-semibold text-[#0f172a] hover:bg-[#f1f5f9]"
              >
                <Settings size={18} className="text-[#5865f2]" />
                <span>Settings</span>
              </Link>
              {isSuperadmin && (
                <Link
                  href="/superadmin"
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-[#5865f2]/30 bg-[#5865f2]/10 p-3 text-xs font-semibold text-[#5865f2] hover:bg-[#5865f2]/20"
                >
                  <Shield size={18} />
                  <span>Superadmin</span>
                </Link>
              )}
            </div>

            <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-[#64748b]">
              <span>{user?.email}</span>
              <button
                onClick={() => {
                  setShowMore(false);
                  logout();
                }}
                className="flex items-center gap-1 font-semibold text-[#ef4444] hover:underline"
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Mobile) */}
      <Link
        href="/jobs/new"
        className="fixed bottom-16 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#5865f2] text-white shadow-xl shadow-[#5865f2]/30 transition-transform active:scale-90 md:hidden border border-[#5865f2]/50"
        aria-label="New Job"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}