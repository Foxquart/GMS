"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  FileText,
  ReceiptText,
  Shield,
  ArrowLeftRight,
  AlertTriangle,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  /** Key into the live counts map, for items that carry a badge. */
  badge?: "lowStock";
};
type NavGroup = { label?: string; items: NavItem[] };

/**
 * Every destination, visible at once.
 *
 * Transfers used to hide behind a "More" sheet, which made it effectively
 * undiscoverable. Grouping is what keeps a list this long readable — not
 * hiding half of it.
 *
 * There is no Categories entry: categories and their sub-categories are part
 * of the Parts page now, not a destination of their own.
 */
const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: Home }] },
  {
    label: "Workshop",
    items: [
      { href: "/jobs", label: "Jobs", icon: Wrench },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/reports", label: "Reports", icon: ReceiptText },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/inventory", label: "Parts", icon: Package },
      { href: "/inventory/low-stock", label: "Low Stock", icon: AlertTriangle, badge: "lowStock" },
      // Hidden from the sidebar for now. The pages are still routable — put
      // these back (with their `Truck` and `History` icon imports) to list
      // them again.
      // { href: "/inventory/suppliers", label: "Suppliers", icon: Truck },
      // { href: "/inventory/movements", label: "Movements", icon: History },
      { href: "/inventory/transfers", label: "Transfers", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

/**
 * The floating tab bar on mobile.
 *
 * Four destinations, not eleven: these are the ones a shift actually moves
 * between, and four is what fits as a comfortable target rather than a row of
 * slivers. Everything else — and the account — is one tap away behind the
 * avatar in the top bar, which opens the full tree.
 *
 * Labels here are the same words the full menu uses. A tab called something
 * different from the row it leads to reads as a different destination.
 */
const TAB_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/inventory", label: "Parts", icon: Package },
  { href: "/invoices", label: "Invoices", icon: FileText },
];


/**
 * Maker credit. The whole line is one link so the target is a comfortable tap
 * rather than a five-character word, and it opens in a new tab so nobody loses
 * the workshop mid-job. `rel="noreferrer"` because this is a cross-origin
 * `target="_blank"`.
 */
function BuiltByFoxquart({ className }: { className?: string }) {
  return (
    <a
      href="https://foxquart.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Built by Foxquart — opens foxquart.com in a new tab"
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold",
        "text-[var(--ink-label)] transition-colors duration-150 ease-out",
        "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink-muted)]",
        className,
      )}
    >
      <span>Built by</span>
      {/* Decorative: the word beside it already names the maker.
          A 14px static SVG in the sidebar footer is never the LCP element, so
          next/image would add a loader and layout machinery for nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px]" />
      <span className="font-extrabold text-[var(--ink-muted)]">Foxquart</span>
    </a>
  );
}

export function AppNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ userId: string; email: string; role: string }>("/api/auth/me"),
  });

  // Same query key the Low stock page uses, so the badge and the page share
  // one cached response rather than fetching twice.
  const { data: lowStock } = useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: () => api<unknown[]>("/api/inventory/low-stock"),
  });

  const badgeCounts: Record<string, number> = { lowStock: lowStock?.length ?? 0 };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Longest match wins, so /inventory/suppliers highlights Suppliers rather
  // than lighting up its parent Parts row as well.
  const activeHref = ALL_HREFS.filter((href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"),
  ).sort((a, b) => b.length - a.length)[0];

  // The tab bar highlights the *section* you are in, not the exact page: on
  // /inventory/suppliers the Parts tab stays lit, because that is the tab you
  // took to get there. The sidebar deliberately does the opposite — it lists
  // the sub-pages, so it can point at the exact one.
  const activeTab = TAB_ITEMS.map((t) => t.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const lowStockCount = badgeCounts.lowStock;

  const isSuperadmin = user?.role?.toUpperCase() === "SUPERADMIN";
  const superadminActive = pathname.startsWith("/superadmin");

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    triggerRef.current?.focus(); // focus returns to what opened it (WCAG 2.4.3)
  }, []);

  // Escape to leave, and a focus trap so keyboard users cannot tab out into
  // the inert page behind the scrim (WCAG 2.1.2, no keyboard trap).
  useEffect(() => {
    if (!drawerOpen) return;
    const node = drawerRef.current;
    node?.querySelector<HTMLElement>("a, button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const focusables = node.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  const displayName = user?.email ? user.email.split("@")[0] : "Garage Admin";
  const initial = user?.email ? user.email[0].toUpperCase() : "G";

  const navBody = (onNavigate?: () => void) => (
    <nav aria-label="Main" className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label ?? `group-${gi}`} className="space-y-0.5">
          {group.label && (
            <p className="tile-label px-4 pb-1.5 text-[var(--ink-label)]">{group.label}</p>
          )}
          {group.items.map((item) => {
            const active = activeHref === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--r-control)] px-4 py-2.5 text-sm font-bold",
                  "transition-[background-color,color] duration-150 ease-out",
                  active
                    ? "bg-[var(--sage)] text-[var(--forest)]"
                    : "text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge && badgeCounts[item.badge] > 0 && (
                  <span
                    aria-label={`${badgeCounts[item.badge]} needing attention`}
                    className="tabular shrink-0 rounded-full bg-[var(--terracotta)] px-2 py-0.5 text-[11px] font-extrabold text-[#fdf6f2]"
                  >
                    {badgeCounts[item.badge]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      {isSuperadmin && (
        <div className="space-y-0.5">
          <p className="tile-label px-4 pb-1.5 text-[var(--ink-label)]">Platform</p>
          <Link
            href="/superadmin"
            onClick={onNavigate}
            aria-current={superadminActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[var(--r-control)] px-4 py-2.5 text-sm font-bold",
              "transition-[background-color,color] duration-150 ease-out",
              superadminActive
                ? "bg-[var(--ochre)] text-[var(--forest-deep)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
            )}
          >
            <Shield size={18} className="shrink-0" />
            <span className="truncate">Superadmin</span>
          </Link>
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Bypass block for keyboard users (WCAG 2.4.1). */}
      <a
        href="#main"
        className="sr-only rounded-full bg-[var(--forest)] px-4 py-2 text-sm font-bold text-[var(--ink-on-dark)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
      >
        Skip to content
      </a>

      {/* ── Desktop sidebar ─────────────────────────────────────────────
          Persistent from 1024px up, where there is room for it to earn its
          keep; below that the same tree lives in the drawer. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-[var(--hairline)] bg-[var(--surface)] lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-control)] bg-[var(--forest)] text-[var(--ink-on-dark)]">
            <Wrench size={19} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-[var(--ink)]">
              Garage Manager
            </p>
            <p className="text-[11px] font-semibold text-[var(--ink-muted)]">Digital Workshop</p>
          </div>
        </div>

        {navBody()}

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--hairline)] p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sage)] text-xs font-extrabold text-[var(--forest)]">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[var(--ink)]">{displayName}</p>
              <p className="text-[11px] font-semibold capitalize text-[var(--ink-muted)]">
                {(user?.role || "ADMIN").toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-full p-2 text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:bg-[var(--surface-sunk)] hover:text-[var(--terracotta)]"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div className="shrink-0 border-t border-[var(--hairline)] px-3 py-2">
          <BuiltByFoxquart />
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────────
          Identity on the left, the account on the right. Navigation itself
          has moved to the floating bar in the thumb zone, so the only control
          up here is the avatar — the least-reached corner of the screen now
          holds the least-used control instead of the most-used one. */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--hairline)] bg-[var(--canvas)]/95 px-4 backdrop-blur-sm lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--forest)] text-[var(--ink-on-dark)]">
            <Wrench size={14} />
          </div>
          <span className="truncate text-sm font-extrabold tracking-tight text-[var(--ink)]">
            Garage Manager
          </span>
        </div>

        <button
          ref={triggerRef}
          onClick={() => setDrawerOpen(true)}
          // The dot is the only cue that something inside the menu wants
          // attention, so the label has to say what it means — a bare dot is
          // invisible to a screen reader and ambiguous to everyone else.
          aria-label={
            lowStockCount > 0
              ? `Menu and account — ${lowStockCount} parts low on stock`
              : "Menu and account"
          }
          aria-expanded={drawerOpen}
          aria-controls="app-drawer"
          className="relative -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-150 ease-out active:scale-95"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--sage)] text-sm font-extrabold text-[var(--forest)]">
            {initial}
          </span>
          {/* Not decoration: the drawer behind this button holds Low Stock,
              and this is that badge showing through. It was `aria-hidden` with
              no text anywhere, so a screen-reader user got a menu button with
              nothing to say why it wanted attention — the one group the dot
              cannot reach on its own. */}
          {lowStockCount > 0 && (
            <>
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--canvas)] bg-[var(--terracotta)]"
              />
              <span className="sr-only">
                — {lowStockCount} part{lowStockCount === 1 ? "" : "s"} low on stock
              </span>
            </>
          )}
        </button>
      </header>

      {/* ── Mobile tab bar ──────────────────────────────────────────────
          Floats clear of the screen edge rather than sitting flush on it, so
          it reads as a control that belongs to your hand rather than a band
          welded to the bottom of the page. `--nav-inset` reserves exactly the
          room it takes, so nothing ever ends up underneath it. */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        {/* Content dissolves into the canvas as it scrolls past instead of
            colliding with a hard edge. */}
        <div
          aria-hidden="true"
          className="h-6 bg-gradient-to-t from-[var(--canvas)] to-transparent"
        />
        <div className="bg-[var(--canvas)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <nav
            aria-label="Primary"
            className="flex h-16 items-center gap-1 rounded-full border border-[var(--hairline)] bg-[var(--surface-bright)] px-2 shadow-[var(--lift-3)]"
          >
            {TAB_ITEMS.map((item) => {
              const active = activeTab === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1",
                    "transition-colors duration-150 ease-out",
                    active
                      ? "bg-[var(--sage)] text-[var(--forest)]"
                      : "text-[var(--ink-muted)] active:bg-[var(--surface-sunk)]",
                  )}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
                  <span className="max-w-full truncate text-[10px] font-bold leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Mobile menu sheet ───────────────────────────────────────────
          Everything the tab bar does not carry, plus the account. Opened from
          the avatar, so it covers the screen rather than sitting beside it. */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-[var(--forest-deep)]/50"
              onClick={closeDrawer}
            />
            <motion.div
              ref={drawerRef}
              id="app-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 380 }}
              // Full width, and entering from the right — the side the avatar
              // that opens it sits on. A part-width panel would leave a strip
              // of dead page beside a list this long for no benefit; at full
              // width the rows are the widest targets on the screen.
              className="absolute inset-y-0 right-0 flex w-full flex-col bg-[var(--surface)] shadow-[var(--lift-3)]"
            >
              {/* Coloured header: wordmark and the way out along the top,
                  then who is signed in, centred. The curved bottom edge is
                  what makes it read as a header rather than a coloured band. */}
              <div className="shrink-0 rounded-b-[2rem] bg-[var(--forest)] px-5 pb-7 pt-[calc(1rem+env(safe-area-inset-top))] text-[var(--ink-on-dark)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <Wrench size={14} />
                    </div>
                    <span className="truncate text-sm font-extrabold tracking-tight">
                      Garage Manager
                    </span>
                  </div>
                  <button
                    onClick={closeDrawer}
                    aria-label="Close navigation menu"
                    className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out active:bg-white/15"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-5 flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--sage)] text-xl font-extrabold text-[var(--forest)]">
                    {initial}
                  </div>
                  <p className="mt-3 max-w-full truncate text-lg font-extrabold tracking-tight">
                    {displayName}
                  </p>
                  <p className="max-w-full truncate text-xs font-semibold text-[var(--ink-on-dark-muted)]">
                    {user?.email ?? "Signed in"}
                  </p>
                </div>
              </div>

              {navBody(() => setDrawerOpen(false))}

              {/* Sign out sits apart from navigation on purpose — it is
                  destructive and should never be a mis-tap away from a link. */}
              <div className="shrink-0 border-t border-[var(--hairline)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-[var(--r-control)] px-4 py-3 text-sm font-bold text-[var(--terracotta)] transition-colors duration-150 ease-out active:bg-[var(--terracotta)]/10"
                >
                  <LogOut size={18} />
                  <span>Sign out</span>
                </button>
                <BuiltByFoxquart className="mt-1" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
