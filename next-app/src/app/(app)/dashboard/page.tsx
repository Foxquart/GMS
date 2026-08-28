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
} from "lucide-react";
import { api } from "@/lib/api";
import { currency, formatDate, invoiceStatusLabel } from "@/lib/format";
import {
  Badge,
  BentoGrid,
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
      // Unpaid credit across every ISSUED / PARTIALLY_PAID invoice.
      label: "Outstanding credit",
      value: currency(report?.outstanding),
      icon: HandCoins,
      chip: "bg-[var(--terracotta)]/14 text-[var(--terracotta-hover)]",
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
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {/* ── Today, at a squint ───────────────────────────────────────── */}
      {isLoading ? (
        <BentoGrid>
          <Skeleton className="col-span-2 h-44" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </BentoGrid>
      ) : (
      <BentoGrid>
        <Tile tone="forest" className="col-span-2 flex min-h-44 flex-col justify-between gap-6 p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="tile-label text-[var(--ink-on-dark-muted)]">Billed today</span>
            <IndianRupee size={18} className="shrink-0 opacity-45" />
          </div>
          <div>
            <p className="numeral truncate text-[clamp(2.5rem,13vw,4rem)]">
              {currency(summary?.todayBilled)}
            </p>
            <p className="mt-2 text-xs font-semibold text-[var(--ink-on-dark-muted)]">
              {summary?.activeJobs ?? 0} on the floor · {summary?.completedToday ?? 0} closed today
            </p>
          </div>
        </Tile>

        <StatTile
          tone="sage"
          label="Collected"
          value={currency(summary?.todayCollected)}
          footnote="Payments taken today"
          icon={<Wallet size={16} />}
        />
        <StatTile
          tone="terracotta"
          label="Outstanding credit"
          value={currency(summary?.outstanding)}
          footnote="Unpaid across all invoices"
          icon={<HandCoins size={16} />}
        />
        <StatTile
          tone="ochre"
          label="Active jobs"
          value={String(summary?.activeJobs ?? 0)}
          footnote="Open on the floor"
          icon={<Wrench size={16} />}
        />
        <StatTile
          tone="forest"
          label="Completed today"
          value={String(summary?.completedToday ?? 0)}
          footnote="Finished and invoiced"
          icon={<CircleCheckBig size={16} />}
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
            message={(reportError as Error)?.message}
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
                    <span className="truncate text-sm font-bold text-[var(--ink)]">{r.label}</span>
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
            message={(outstandingError as Error)?.message}
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
