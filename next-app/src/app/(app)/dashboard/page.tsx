"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  IndianRupee,
  Wallet,
  HandCoins,
  Wrench,
  FileText,
  PackageX,
  Users,
  ArrowRight,
  ClipboardList,
  ReceiptText,
  CircleCheckBig,
  ShoppingCart,
  Warehouse,
  Store,
} from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { currency, currencyFit, formatDate, invoiceStatusLabel } from "@/lib/format";
import {
  Badge,
  BentoGrid,
  breakableFigure,
  EmptyState,
  ErrorState,
  SectionHeader,
  Skeleton,
  StatTile,
  Tile,
} from "@/components/ui";
import {
  SpotClipboard,
  SpotOilCan,
  SpotStamp,
  VEHICLE_SPOT,
} from "@/components/illustrations";
import { cn } from "@/lib/cn";

const PERIODS = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "yearly", label: "Year" },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

/** Plain grouped count — units on a shelf are never fractional. */
const units = (n: number | null | undefined) => Number(n ?? 0).toLocaleString("en-IN");

/**
 * Geometry for the two lead tiles — the day's money in and money out. One
 * string applied to both, so "same height" is a property of the pair rather
 * than two numbers that happen to agree: change it once and they move
 * together. The height is deliberate too — these two are read from across the
 * counter, the six below them are read when you go looking.
 */
const HERO_TILE = "min-h-[9.5rem] justify-between gap-3 p-4";

/**
 * How much figure each tile can hold. The hero pair is tall enough for two
 * lines of numeral and now uses them — the exact amount is worth a wrap. The
 * small tiles have one line, so a big figure there falls back to "₹12.35 lakh"
 * rather than being cut off. Both budgets are the narrowest render: a 320px
 * phone, where the numeral has hit its rem floor but the tile is still
 * shrinking.
 */
const HERO_FIT = { lines: 2, emPerLine: 4.4 };
const SMALL_FIT = { lines: 1, emPerLine: 5.2 };

/** Shared shell for every list row on this page: identity left, facts right. */
const ROW =
  "flex items-center gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5 " +
  "transition-[background-color,border-color,transform] duration-150 ease-out " +
  "hover:border-[var(--hairline-strong)] hover:bg-[var(--surface)] active:scale-[0.995]";

/** Small tinted plate that carries a spot illustration inside a row. */
function Plate({
  children,
  tone = "sunk",
}: {
  children: React.ReactNode;
  tone?: "sunk" | "sage" | "ochre";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[var(--r-control)]",
        tone === "sunk" && "bg-[var(--surface-sunk)]",
        tone === "sage" && "bg-[var(--sage)]",
        tone === "ochre" && "bg-[var(--ochre)]/25",
      )}
    >
      {children}
    </span>
  );
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full text-xs font-bold text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:text-[var(--ink)]"
    >
      {children} <ArrowRight size={13} />
    </Link>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodId>("daily");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<any>("/api/dashboard"),
  });

  const {
    data: report,
    isLoading: loadingReport,
    isError: reportIsError,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ["report", period],
    queryFn: () => api<any>(`/api/reports/${period}`),
  });

  const {
    data: outstandingCustomers,
    isLoading: loadingOutstanding,
    isError: outstandingIsError,
    error: outstandingError,
    refetch: refetchOutstanding,
  } = useQuery({
    queryKey: ["report", "outstanding"],
    queryFn: () => api<any[]>("/api/reports/outstanding"),
  });

  const summary = data?.summary;

  const reportRows = [
    {
      label: "Billed",
      value: currency(report?.billed),
      icon: IndianRupee,
      chip: "bg-[var(--surface-sunk)] text-[var(--ink)]",
    },
    {
      label: "Collected",
      value: currency(report?.collected),
      icon: Wallet,
      chip: "bg-[var(--sage)] text-[var(--forest)]",
    },
    {
      // Unpaid credit across every ISSUED / PARTIALLY_PAID invoice. Unlike
      // every other row here this is a running balance, not a flow, so it is
      // deliberately NOT scoped to the selected period — money owed does not
      // stop being owed because you switched the tab to Today. Tagged so the
      // figure cannot be misread as "owed today".
      label: "Outstanding credit",
      value: currency(report?.outstanding),
      icon: HandCoins,
      chip: "bg-[var(--terracotta)]/14 text-[var(--terracotta-hover)]",
      allTime: true,
    },
    {
      label: "Jobs completed",
      value: String(report?.jobsCompleted ?? 0),
      icon: Wrench,
      chip: "bg-[var(--sage)] text-[var(--forest)]",
    },
    {
      label: "Invoices issued",
      value: String(report?.invoicesCount ?? 0),
      icon: FileText,
      chip: "bg-[var(--surface-sunk)] text-[var(--ink)]",
    },
    {
      label: "Parts consumed",
      value: String(report?.partsConsumed ?? 0),
      icon: PackageX,
      chip: "bg-[var(--ochre)]/25 text-[#8a6a10]",
    },
  ];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const header = (
    <header>
      <p className="tile-label text-[var(--ink-label)]" suppressHydrationWarning>
        {formatDate(new Date())}
      </p>
      <h1
        className="mt-1.5 text-[clamp(1.75rem,8vw,2.25rem)] font-extrabold leading-none tracking-tight text-[var(--ink)]"
        suppressHydrationWarning
      >
        {greeting()}
      </h1>
      <p className="mt-2 text-sm font-semibold text-[var(--ink-muted)]">
        Here is how the workshop is running today.
      </p>
    </header>
  );

  if (isError) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState
          title="Couldn't load the dashboard"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Nothing on this page is pinned, deliberately. The list pages pin their
  // search and filters because those controls govern an unbounded list
  // scrolling beneath them — the dashboard has no such relationship. The
  // greeting is read once, so pinning it would spend a fifth of a 360x640
  // phone on a line nobody re-reads, and the bento underneath is the whole
  // point of the screen. The one live control, the period tabs, sits 52px
  // above the card it drives and the entire report section is ~400px, well
  // inside the 584px content area of the smallest phone we target: if you can
  // read the six figures you can already reach the tabs. Pinning them would
  // also lay a full-bleed divider band across the middle of the page and make
  // the four SectionHeaders below it read as subordinate to the report. The
  // mobile top bar stays the only fixed chrome here.
  return (
    <div className="space-y-6">
      {header}

      {/* ── Today, at a squint ───────────────────────────────────────── */}
      {isLoading ? (
        <BentoGrid>
          <Skeleton className="h-[9.5rem]" />
          <Skeleton className="h-[9.5rem]" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[6.25rem]" />
          ))}
        </BentoGrid>
      ) : (
      <BentoGrid>
        {/* Row one is the day's two money questions side by side: what came
            in, what the shelves cost. They lead the grid — taller than the
            six behind them and the only two carrying a solid accent fill, so
            the pair reads first at a squint. Forest for takings, ochre for
            stock, per the semantic mapping in DESIGN.md; the six below stay
            small and quiet so this row keeps its weight. */}
        <Tile tone="forest" className={cn("flex flex-col", HERO_TILE)}>
          <div className="flex items-start justify-between gap-2">
            <span className="tile-label text-[var(--ink-on-dark-muted)]">Billed today</span>
            <IndianRupee size={18} className="shrink-0 opacity-45" />
          </div>
          <div>
            <p className="numeral break-words text-[clamp(1.6rem,7vw,2.5rem)]">
              {breakableFigure(currencyFit(summary?.todayBilled, HERO_FIT))}
            </p>
            <p className="mt-1 text-xs font-semibold leading-tight text-[var(--ink-on-dark-muted)]">
              {summary?.activeJobs ?? 0} open · {summary?.completedToday ?? 0} closed
            </p>
          </div>
        </Tile>

        <StatTile
          tone="ochre"
          wrap
          className={HERO_TILE}
          label="Spent on stock"
          value={currencyFit(summary?.stockPurchased, HERO_FIT)}
          footnote="Cost of every unit booked in"
          icon={<ShoppingCart size={18} />}
        />

        <StatTile
          size="sm"
          tone="sage"
          label="Collected"
          value={currencyFit(summary?.todayCollected, SMALL_FIT)}
          footnote="Payments taken today"
          icon={<Wallet size={15} />}
        />
        <StatTile
          size="sm"
          tone="ochre"
          label="Active jobs"
          value={String(summary?.activeJobs ?? 0)}
          footnote="Open on the floor"
          icon={<Wrench size={15} />}
        />

        {/* What is standing on the shelves at each location, in the same
            neutral fill as the money that bought it. */}
        <StatTile
          size="sm"
          tone="bright"
          label="Warehouse stock"
          value={units(summary?.warehouseUnits)}
          unit="units"
          footnote={`${currency(summary?.warehouseStockValue)} at cost`}
          icon={<Warehouse size={15} />}
        />
        <StatTile
          size="sm"
          tone="bright"
          label="Shop stock"
          value={units(summary?.shopUnits)}
          unit="units"
          footnote={`${currency(summary?.shopStockValue)} at cost`}
          icon={<Store size={15} />}
        />

        {/* Closing pair. Neither is a live figure you act on mid-shift —
            outstanding credit is a running balance that only moves when a
            customer pays, and completed today is the tally you read at the
            end of the day — so they sit last, after the work in front of you
            and the stock behind it. */}
        <StatTile
          size="sm"
          tone="terracotta"
          label="Outstanding credit"
          value={currencyFit(summary?.outstanding, SMALL_FIT)}
          footnote="Unpaid across all invoices"
          icon={<HandCoins size={15} />}
        />
        <StatTile
          size="sm"
          tone="forest"
          label="Completed today"
          value={String(summary?.completedToday ?? 0)}
          footnote="Finished and invoiced"
          icon={<CircleCheckBig size={15} />}
        />
      </BentoGrid>
      )}

      {/* ── Period report ────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Workshop report" icon={<ReceiptText size={18} />} />

        <div
          role="tablist"
          aria-label="Report period"
          className="mb-3 flex select-none rounded-full bg-[var(--surface-sunk)] p-1"
        >
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "relative isolate flex-1 cursor-pointer rounded-full px-3 py-2 text-xs font-extrabold",
                  "transition-[color] duration-150 ease-out",
                  active
                    ? "text-[var(--ink-on-dark)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="dashboard-period-pill"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-[var(--forest)]"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                {p.label}
              </button>
            );
          })}
        </div>

        {loadingReport ? (
          <Skeleton className="h-[19.5rem] rounded-[var(--r-card)]" />
        ) : reportIsError ? (
          <ErrorState
            title="Couldn't load this report"
            message={errorMessage(reportError)}
            reference={errorReference(reportError)}
            onRetry={() => refetchReport()}
          />
        ) : (
          <Tile tone="cream" className="p-0">
            <div className="divide-y divide-[var(--hairline)]">
              {reportRows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", r.chip)}>
                      <r.icon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[var(--ink)]">
                        {r.label}
                      </span>
                      {r.allTime && (
                        <span className="tile-label text-[var(--ink-label)]">All time</span>
                      )}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-extrabold text-[var(--ink)]">
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </Tile>
        )}
      </section>

      {/* ── Active jobs ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Active jobs"
          icon={<Wrench size={18} />}
          action={<SectionLink href="/jobs">All jobs</SectionLink>}
        />
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.75rem]" />
            ))}
          </div>
        ) : !data?.activeJobs?.length ? (
          <EmptyState
            title="Nothing on the floor"
            description="Every job is closed. Open a new one when the next vehicle arrives."
            illustration={<SpotStamp size={84} />}
          />
        ) : (
          <div className="space-y-2.5">
            {data.activeJobs.map((job: any) => {
              const Spot = VEHICLE_SPOT[(job.vehicleType as keyof typeof VEHICLE_SPOT) ?? "OTHER"] ?? VEHICLE_SPOT.OTHER;
              return (
                <Link key={job.id} href={`/jobs/${job.id}`} className={ROW}>
                  <Plate>
                    <Spot size={38} />
                  </Plate>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                      {job.customerName}
                    </p>
                    <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                      {job.jobNumber} · {formatDate(job.createdAt)}
                    </p>
                    {job.complaint && (
                      <p className="truncate text-xs text-[var(--ink-label)]">{job.complaint}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Badge color="amber" dot>
                      Open
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Low shop stock ───────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Low shop stock"
          icon={<PackageX size={18} />}
          action={<SectionLink href="/inventory">Inventory</SectionLink>}
        />
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.75rem]" />
            ))}
          </div>
        ) : !data?.lowStock?.length ? (
          <EmptyState
            title="Shelves are stocked"
            description="Every part is above its minimum shop level."
            illustration={<SpotOilCan size={84} />}
          />
        ) : (
          <div className="space-y-2.5">
            {data.lowStock.slice(0, 6).map((p: any) => (
              <Link key={p.id} href={`/inventory/parts/${p.id}`} className={ROW}>
                <Plate tone="ochre">
                  <SpotOilCan size={34} />
                </Plate>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[var(--ink)]">{p.name}</p>
                  <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                    Minimum {p.minimumShopStock} · Warehouse {p.warehouseStock}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="numeral text-lg text-[var(--ink)]">{p.shopStock}</span>
                  <span className="tile-label text-[var(--ink-label)]">In shop</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Customers carrying credit ────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Outstanding credit"
          icon={<Users size={18} />}
          action={<SectionLink href="/customers">Customers</SectionLink>}
        />
        {loadingOutstanding ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.75rem]" />
            ))}
          </div>
        ) : outstandingIsError ? (
          <ErrorState
            title="Couldn't load outstanding credit"
            message={errorMessage(outstandingError)}
            reference={errorReference(outstandingError)}
            onRetry={() => refetchOutstanding()}
          />
        ) : !outstandingCustomers?.length ? (
          <EmptyState
            title="Everyone is settled up"
            description="No customer is carrying an unpaid balance right now."
            illustration={<SpotStamp size={84} />}
          />
        ) : (
          <div className="space-y-2.5">
            {outstandingCustomers.map((c: any) => (
              <Link key={c.customerId} href={`/customers/${c.customerId}`} className={ROW}>
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-control)] bg-[var(--terracotta)]/14 text-sm font-extrabold text-[var(--terracotta-hover)]"
                >
                  {c.customerName ? c.customerName[0].toUpperCase() : <Users size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                    {c.customerName}
                  </p>
                  <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                    {c.customerPhone}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tabular text-sm font-extrabold text-[var(--terracotta-hover)]">
                    {currency(c.dueAmount)}
                  </span>
                  <span className="tile-label text-[var(--ink-label)]">Due</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent invoices ──────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Recent invoices"
          icon={<ClipboardList size={18} />}
          action={<SectionLink href="/invoices">All invoices</SectionLink>}
        />
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.75rem]" />
            ))}
          </div>
        ) : !data?.recentInvoices?.length ? (
          <EmptyState
            title="No invoices yet"
            description="An invoice is raised the moment you complete a job."
            illustration={<SpotClipboard size={84} />}
          />
        ) : (
          <div className="space-y-2.5">
            {data.recentInvoices.map((inv: any) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className={ROW}>
                <Plate tone="sage">
                  <SpotClipboard size={34} />
                </Plate>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                    {inv.customerName}
                  </p>
                  <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                    {inv.invoiceNumber} · {formatDate(inv.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="tabular text-sm font-extrabold text-[var(--ink)]">
                    {currency(inv.total)}
                  </span>
                  <Badge
                    color={
                      inv.status === "PAID" ? "green" : inv.status === "PARTIALLY_PAID" ? "amber" : "slate"
                    }
                    dot
                  >
                    {invoiceStatusLabel(inv.status)}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
