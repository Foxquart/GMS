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
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button, Skeleton } from "@/components/ui";
import { SpotCone } from "@/components/illustrations";

const NAV_ITEMS = [
  { href: "/superadmin", label: "Overview", icon: Shield },
  { href: "/superadmin/health", label: "Health", icon: Activity },
  { href: "/superadmin/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/superadmin/admins", label: "Admins", icon: Users },
  { href: "/superadmin/activity", label: "Activity", icon: FileText },
  { href: "/superadmin/system", label: "System info", icon: Server },
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

  // The console chrome is the thing that takes a moment to authorise — so
  // paint its shape rather than a spinner on a dark field.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--canvas)]" role="status" aria-live="polite">
        <span className="sr-only">Checking your operator access…</span>
        <div className="h-16 bg-[var(--forest)]" />
        <div className="border-b border-[var(--hairline)] bg-[var(--surface)] px-4 py-2.5 md:px-8">
          <div className="mx-auto flex max-w-6xl gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:px-8">
          <Skeleton className="h-6 w-56 rounded-full" />
          <Skeleton className="h-40 rounded-[var(--r-card)]" />
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-4 py-10">
        <div className="w-full max-w-md rounded-[var(--r-panel)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-8 text-center">
          <SpotCone size={84} className="mx-auto" />
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-[var(--ink)]">
            This console is operator-only
          </h1>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-[var(--ink-muted)]">
            The control plane needs the SUPERADMIN role. Your account{" "}
            <span className="font-bold text-[var(--ink)]">{user.email}</span> is signed in as{" "}
            <span className="font-bold text-[var(--ink)]">{user.role}</span>.
          </p>
          <Link href="/dashboard" className="mt-6 inline-block">
            <Button variant="primary" size="md">
              <ArrowLeft size={16} />
              Back to the workshop
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      {/* Operator bar. Forest fill: this console is deliberately graver than
          the owner-facing app, using the same palette rather than a new one. */}
      <header className="sticky top-0 z-40 bg-[var(--forest)] text-[var(--ink-on-dark)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
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
            <Link
              href="/dashboard"
              className={cn(
                "hidden items-center gap-1.5 rounded-full bg-[var(--forest-deep)] px-3.5 py-2 text-xs font-bold",
                "text-[var(--ink-on-dark)] transition-[background-color,transform] duration-150 ease-out",
                "hover:bg-[var(--forest-hover)] active:scale-[0.97] md:inline-flex",
              )}
            >
              <ArrowLeft size={14} />
              Workshop
            </Link>
            <div className="hidden text-right sm:block">
              <p className="max-w-[16rem] truncate text-xs font-bold">{user.email}</p>
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

      <nav className="border-b border-[var(--hairline)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-4 py-2.5 md:px-8">
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

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
