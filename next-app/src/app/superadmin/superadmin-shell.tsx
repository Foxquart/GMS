"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  Activity,
  AlertTriangle,
  Users,
  FileText,
  Server,
  LogOut,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/superadmin", label: "Overview", icon: Shield },
  { href: "/superadmin/health", label: "Health", icon: Activity },
  { href: "/superadmin/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/superadmin/admins", label: "Admins", icon: Users },
  { href: "/superadmin/activity", label: "Activity", icon: FileText },
  { href: "/superadmin/system", label: "System info", icon: Server },
];

/**
 * Chrome for the operator console. Access is settled by the server layout
 * above — by the time this renders the viewer is a superadmin, so there is no
 * check, no skeleton while one runs, and no refused-access card.
 */
export function SuperadminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]"
      // This console renders its own chrome outside `(app)`, so `StickyControls`
      // — which assumes the app's 56px mobile top bar (`top-14`, `lg:top-0`) —
      // does not fit here. Anything a page beneath wants to pin must clear the
      // operator bar *and* the section tabs, both of which stay put at every
      // width: 4rem of bar + 3.5rem of tab row + its 1px hairline. Pages pin
      // with `sticky top-[var(--console-sticky-top)] z-20`; z stays under the
      // bar's z-40 and the tabs' z-30 so it slides beneath them, not over.
      style={{ "--console-sticky-top": "calc(4rem + 3.5rem + 1px)" } as React.CSSProperties}
    >
      {/* Operator bar. Forest fill: this console is deliberately graver than
          the owner-facing app, using the same palette rather than a new one. */}
      <header className="sticky top-0 z-40 bg-[var(--forest)] text-[var(--ink-on-dark)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-[var(--forest-deep)]">
              <Shield size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight">Control plane</p>
              <p className="truncate text-[11px] font-semibold text-[var(--ink-on-dark-muted)]">
                Observability &amp; admin access
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="max-w-[16rem] truncate text-xs font-bold">{email}</p>
              <p className="tile-label text-[var(--ink-on-dark-muted)]">Superadmin</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--forest-deep)]",
                "text-[var(--ink-on-dark-muted)] transition-[background-color,color,transform] duration-150 ease-out",
                "hover:bg-[var(--terracotta)] hover:text-[#fdf6f2] active:scale-90 cursor-pointer",
              )}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* The tabs are the only way between the six sections of this console —
          it has no drawer — so they ride under the operator bar rather than
          scrolling away on pages that run past a screen. Fixed `h-14` because
          the offset above is computed from it. The sticky element is the
          <nav>; the scroll container is the row inside it, so the horizontal
          tab scroll and the sticky positioning stay out of each other's way. */}
      <nav className="sticky top-16 z-30 border-b border-[var(--hairline)] bg-[var(--surface)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-1.5 overflow-x-auto px-4 lg:px-8">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/superadmin" ? pathname === "/superadmin" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold whitespace-nowrap",
                  "transition-[background-color,color] duration-150 ease-out",
                  active
                    ? "bg-[var(--forest)] text-[var(--ink-on-dark)]"
                    : "text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
                )}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
