"use client";

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
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

const CHANNELS = [
  { href: "/dashboard", label: "dashboard", icon: Home },
  { href: "/jobs", label: "jobs", icon: Wrench },
  { href: "/inventory", label: "inventory", icon: Package },
  { href: "/customers", label: "customers", icon: Users },
  { href: "/settings", label: "settings", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname() || "";
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ userId: string; email: string }>("/api/auth/me"),
  });

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div suppressHydrationWarning>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#e2e8f0] bg-white md:flex">
        {/* Server Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#e2e8f0] bg-white px-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#5865f2] text-white shadow-md shadow-[#5865f2]/25 font-bold transition-transform hover:rounded-xl cursor-pointer">
              <Wrench size={19} />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold tracking-wide text-[#0f172a]">Garage Manager</span>
                {/* <ShieldCheck size={14} className="text-[#5865f2]" /> */}
              </div>
              {/* <p className="text-[11px] font-medium text-[#16a34a] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                Workshop Active
              </p> */}
            </div>
          </div>
          {/* <ChevronDown size={18} className="text-[#94a3b8]" /> */}
        </div>

        {/* Channels List */}
        <nav className="flex-1 space-y-4 px-2 py-3 overflow-y-auto">
          <div className="space-y-0.5">
            {CHANNELS.map((item) => {
              const active = isActive(item.href);
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
                  {/* Active left vertical indicator pill */}
                  <div
                    className={cn(
                      "absolute -left-2 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#5865f2] transition-all duration-200",
                      active ? "h-5 opacity-100" : "h-0 opacity-0 group-hover:h-2 group-hover:opacity-60",
                    )}
                  />
                  {/* <Hash size={18} className={cn(active ? "text-[#5865f2]" : "text-[#94a3b8] group-hover:text-[#0f172a]")} /> */}
                  <span className="capitalize">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Card Footer */}
        <div className="border-t border-[#e2e8f0] bg-[#f8fafc] p-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white">
              {user?.email ? user.email[0].toUpperCase() : "G"}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#16a34a] ring-2 ring-[#f8fafc]" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#0f172a] truncate">
                {user?.email ? user.email.split("@")[0] : "Garage Admin"}
              </p>
              <p className="text-[10px] text-[#64748b]">Online</p>
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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#e2e8f0] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {CHANNELS.map((item) => {
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
              <span className="capitalize">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Floating Action Button (Mobile) */}
      <Link
        href="/jobs/new"
        className="fixed bottom-16 right-4 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-[#5865f2] text-white shadow-xl shadow-[#5865f2]/30 transition-transform active:scale-90 md:hidden border border-[#5865f2]/50"
        aria-label="New Job"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}