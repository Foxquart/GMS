"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
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
  Shield,
  Layers,
  Truck,
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
  { href: "/inventory/categories", label: "Categories", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_PRIMARY = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
];

/**
 * Routes whose primary create-action belongs on the floating button.
 *
 * Pages that carry their own bottom action bar (Inventory has Transfer /
 * New Part) are deliberately absent — a global FAB would land on top of
 * those buttons and cover them. The dashboard is absent too: its report
 * rows run the full width, so a floating button sits on the figures.
 */
const FAB_ROUTES: { match: string; href: string; label: string }[] = [
  { match: "/jobs", href: "/jobs/new", label: "New job" },
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

  // /inventory/categories also matches /inventory, which would highlight two
  // sidebar rows at once. Longest match wins.
  const activeChannel = DESKTOP_CHANNELS.map((c) => c.href)
    .filter((href) => isActive(href))
    .sort((a, b) => b.length - a.length)[0];

  const isSuperadmin = user?.role?.toUpperCase() === "SUPERADMIN";

  // Only ever one pill is active. Categories and Suppliers sit under
  // /inventory, so the Inventory pill owns them — listing them here too lit
  // up Inventory and More simultaneously and crowded the bar.
  const moreActive = ["/invoices", "/settings", "/superadmin"].some((p) =>
    pathname.startsWith(p),
  );

  // Only exact list roots get the button — not detail pages, which have
  // their own actions, and not routes with a page-level bottom bar.
  const fab = FAB_ROUTES.find((r) => pathname === r.match);

  return (
    <div suppressHydrationWarning>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--hairline)] bg-[var(--surface)] md:flex">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-control)] bg-[var(--forest)] text-[var(--ink-on-dark)]">
            <Wrench size={19} />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-[var(--ink)]">Garage Manager</p>
            <p className="text-[11px] font-semibold text-[var(--ink-muted)]">Digital Workshop</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {DESKTOP_CHANNELS.map((item) => {
            const active = activeChannel === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-bold",
                  "transition-[background-color,color] duration-150 ease-out",
                  active
                    ? "bg-[var(--forest)] text-[var(--ink-on-dark)]"
                    : "text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
                )}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isSuperadmin && (
            <Link
              href="/superadmin"
              className={cn(
                "mt-3 flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-bold",
                "transition-[background-color,color] duration-150 ease-out",
                isActive("/superadmin")
                  ? "bg-[var(--terracotta)] text-[#fdf6f2]"
                  : "text-[var(--terracotta)] hover:bg-[var(--terracotta)]/10",
              )}
            >
              <Shield size={18} />
              <span>Superadmin</span>
            </Link>
          )}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--hairline)] p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sage)] text-xs font-extrabold text-[var(--forest)]">
              {user?.email ? user.email[0].toUpperCase() : "G"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[var(--ink)]">
                {user?.email ? user.email.split("@")[0] : "Garage Admin"}
              </p>
              <p className="text-[11px] font-semibold capitalize text-[var(--ink-muted)]">
                {(user?.role || "ADMIN").toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-full p-2 text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Mobile floating pill ────────────────────────────────────────
          Icon-only at rest; the current section expands to show its label,
          so the pill stays compact and the active page is unmistakable. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-1 rounded-full bg-[var(--forest)] p-1.5 shadow-[var(--lift-3)]">
          {MOBILE_PRIMARY.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-full",
                  "transition-[background-color,color] duration-200 ease-out",
                  active
                    ? "flex-1 bg-[var(--ochre)] px-4 text-[var(--forest-deep)]"
                    : "w-11 shrink-0 text-[var(--ink-on-dark-muted)] active:bg-white/10",
                )}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18, ease: [0.22, 0.9, 0.32, 1] }}
                      className="overflow-hidden whitespace-nowrap text-[13px] font-extrabold"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}

          <button
            onClick={() => setShowMore(true)}
            aria-label="More"
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-full",
              "transition-[background-color,color] duration-200 ease-out",
              moreActive
                ? "flex-1 bg-[var(--ochre)] px-4 text-[var(--forest-deep)]"
                : "w-11 shrink-0 text-[var(--ink-on-dark-muted)] active:bg-white/10",
            )}
          >
            <MoreHorizontal size={19} strokeWidth={moreActive ? 2.4 : 2} className="shrink-0" />
            <AnimatePresence initial={false}>
              {moreActive && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 0.9, 0.32, 1] }}
                  className="overflow-hidden whitespace-nowrap text-[13px] font-extrabold"
                >
                  More
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* ── "More" drawer ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showMore && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-[var(--forest-deep)]/45"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 380 }}
              className="relative z-10 space-y-4 rounded-t-[var(--r-panel)] bg-[var(--surface-bright)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--lift-3)]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[var(--ink)]">More</h2>
                <button
                  onClick={() => setShowMore(false)}
                  className="rounded-full p-2 text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:bg-[var(--surface-sunk)]"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: "/invoices", label: "Invoices", icon: FileText },
                  { href: "/inventory/categories", label: "Categories", icon: Layers },
                  { href: "/inventory/suppliers", label: "Suppliers", icon: Truck },
                  { href: "/settings", label: "Settings", icon: Settings },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className="flex items-center gap-3 rounded-[var(--r-tile)] bg-[var(--surface)] p-4 text-sm font-bold text-[var(--ink)] transition-colors duration-150 ease-out hover:bg-[var(--surface-sunk)]"
                  >
                    <item.icon size={18} className="text-[var(--ink-muted)]" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                {isSuperadmin && (
                  <Link
                    href="/superadmin"
                    onClick={() => setShowMore(false)}
                    className="col-span-2 flex items-center gap-3 rounded-[var(--r-tile)] bg-[var(--terracotta)] p-4 text-sm font-bold text-[#fdf6f2] transition-colors duration-150 ease-out hover:bg-[var(--terracotta-hover)]"
                  >
                    <Shield size={18} />
                    <span>Superadmin Control</span>
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4">
                <span className="truncate text-xs font-semibold text-[var(--ink-muted)]">{user?.email}</span>
                <button
                  onClick={() => {
                    setShowMore(false);
                    logout();
                  }}
                  className="flex shrink-0 items-center gap-1.5 text-xs font-extrabold text-[var(--terracotta)]"
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Floating create button ──────────────────────────────────────
          Sits clear of the nav pill, and only on routes that have no
          bottom action bar of their own. */}
      {fab && (
        <Link
          href={fab.href}
          aria-label={fab.label}
          className="fixed right-4 bottom-[calc(var(--nav-inset)+0.75rem)] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--terracotta)] text-[#fdf6f2] shadow-[var(--lift-3)] transition-[background-color,scale] duration-150 ease-out active:scale-90 md:hidden"
        >
          <Plus size={24} strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}
