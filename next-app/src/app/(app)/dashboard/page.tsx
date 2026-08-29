"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  IndianRupee,
  Wallet,
  Wrench,
  PackageX,
  Users,
  ArrowRight,
  ClipboardList,
  Check,
  Warehouse,
  Store,
  Boxes,
} from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { currency, currencyFit, formatDate, invoiceStatusLabel } from "@/lib/format";
import {
  Badge,
  BentoGrid,
  ErrorState,
  SectionHeader,
  Skeleton,
  StatTile,
} from "@/components/ui";
import { SpotClipboard, SpotOilCan, VEHICLE_SPOT } from "@/components/illustrations";
import { cn } from "@/lib/cn";

/** Plain grouped count — units on a shelf are never fractional. */
const units = (n: number | null | undefined) => Number(n ?? 0).toLocaleString("en-IN");

/**
 * Geometry for the two lead tiles — what today billed, and what today actually
 * collected. One string applied to both, so "same height" is a property of the
 * pair rather than two numbers that happen to agree: change it once and they
 * move together. The height is deliberate too — these two are read from across
 * the counter, the four below them are read when you go looking.
 *
 * The second slot used to hold "Spent on stock", an all-time figure given
 * equal weight to today's takings; it carried a footnote apologising for that,
 * which is not a fix. It has gone to Reports, where a lifetime number belongs.
 */
const HERO_TILE = "min-h-[9.5rem] justify-between gap-3 p-4";

/**
 * How much figure a hero tile can hold, in em of the `.numeral` face, measured
 * at the narrowest render: a 320px phone, where the numeral has hit its rem
 * floor while the tile is still shrinking. Past the budget `currencyFit` hands
 * back the short form rather than letting the figure wrap or truncate.
 *
 * Only the hero pair needs a budget now. The four small tiles below carry
 * counts and unit totals, which are short by nature — the currency figures
 * that needed the wider `SMALL_FIT` have moved to /reports.
 */
const HERO_FIT = { em: 3.8 };

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

/**
 * "Nothing here, and that is the good outcome."
 *
 * These three sections spend most days empty — no open jobs, nothing under its
 * minimum, nobody in debt — and each was drawing a full `EmptyState`: an 84px
 * illustration inside `py-12`, about 200px to say "all clear". Three of them
 * stacked took a phone screen and a half to report an absence. A single row
 * says the same thing, and keeps the sections that *do* have something in them
 * within reach.
 *
 * `EmptyState` still earns its keep where arriving at an empty screen is a
 * dead end the person has to be led out of — a search with no results, a
 * shelf with no parts yet. Here it is just good news.
 */
function AllClear({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface)] px-3.5 py-3 text-sm font-bold text-[var(--ink-muted)]">
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-[var(--forest)]"
      >
        <Check size={14} strokeWidth={3} />
      </span>
      {children}
    </p>
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
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<any>("/api/dashboard"),
  });

  // Top consumers only — the full table is a tap away on /reports. Totals come
  // back computed across every part, so "12 parts used" stays true even though
  // four rows are listed.
  const {
    data: partsUsage,
    isLoading: loadingUsage,
  } = useQuery({
    queryKey: ["report", "parts-usage", "daily", 4],
    queryFn: () => api<any>("/api/reports/parts-usage", { params: { period: "daily", limit: "4" } }),
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

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  /**
   * Two lines, not three, and the date sits beside the greeting rather than
   * above it. "Here is how the workshop is running today" said nothing the
   * page below it did not already show, and the greeting at 8vw was a 36px
   * line on a phone. Together they cost about 100px of the first screen to
   * carry no figure at all.
   */
  const header = (
    <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h1
        className="text-2xl font-extrabold leading-none tracking-tight text-[var(--ink)] sm:text-3xl"
        suppressHydrationWarning
      >
        {greeting()}
      </h1>
      <p className="tile-label text-[var(--ink-label)]" suppressHydrationWarning>
        {formatDate(new Date())}
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
  // scrolling beneath them — the dashboard has no such relationship, and now
  // has no live control at all: the period tabs went to /reports with the
  // figures they drove. The greeting is read once, so pinning it would spend a
  // fifth of a 360x640 phone on a line nobody re-reads, and the bento
  // underneath is the whole point of the screen. The mobile top bar stays the
  // only fixed chrome here.
  //
  // Section order answers the owner's questions in the order they are asked:
  // what came in today (the bento), who owes me (credit), what is on the floor
  // (jobs), what is running out (stock), what was raised (invoices).
  return (
    <div className="space-y-6">
      {header}

      <SectionHeader
        className="mb-0"
        title="Today"
        icon={<IndianRupee size={18} />}
        action={<SectionLink href="/reports">Full report</SectionLink>}
      />

      {/* ── Today, at a squint ───────────────────────────────────────
          Six tiles, not eight. One fill, and only one: forest is the day's
          takings; everything else is a fact you go looking for, so it sits on
          a neutral plate.

          What left, and why. "Spent on stock" was an all-time figure holding a
          hero slot in a row about today — it is a Reports number. "Completed
          today" was its own tile and *also* the second half of the Billed
          footnote, so it was already on screen twice. "Outstanding credit" had
          a tile here and a whole section below listing the people who owe it,
          where it is actionable rather than merely true. What replaced them is
          the one operational fact the grid was missing: how many parts are
          under their minimum. */}
      {isLoading ? (
        <BentoGrid>
          <Skeleton className="h-[9.5rem]" />
          <Skeleton className="h-[9.5rem]" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[6.25rem]" />
          ))}
        </BentoGrid>
      ) : (
      <BentoGrid>
        {/* Row one is the day's two money questions: what was billed, and what
            actually came into the till. They lead the grid on height — the
            four behind them are read when you go looking. */}
        <StatTile
          tone="forest"
          className={HERO_TILE}
          label="Billed today"
          value={currencyFit(summary?.todayBilled, HERO_FIT)}
          footnote={`${summary?.activeJobs ?? 0} open · ${summary?.completedToday ?? 0} closed`}
          icon={<IndianRupee size={18} />}
        />
        <StatTile
          tone="bright"
          className={HERO_TILE}
          label="Collected"
          value={currencyFit(summary?.todayCollected, HERO_FIT)}
          footnote="Payments taken today"
          icon={<Wallet size={18} />}
        />

        {/* Row two is the work: what is open, and what is about to stop you
            finishing it. */}
        <StatTile
          size="sm"
          tone="bright"
          label="Active jobs"
          value={String(summary?.activeJobs ?? 0)}
          footnote="Open on the floor"
          icon={<Wrench size={15} />}
        />
        <StatTile
          size="sm"
          tone="bright"
          label="Low shop stock"
          value={String(summary?.lowStockCount ?? 0)}
          footnote="Under the minimum"
          icon={<PackageX size={15} />}
        />

        {/* Row three is the shelves. Kept, against the advice to cut them: in
            a two-location workshop "have I got one, and is it here or at the
            warehouse" is a counter question, not a reporting one. */}
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
      </BentoGrid>
      )}

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
          <AllClear>Everyone is settled up.</AllClear>
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
          <AllClear>No active jobs — the floor is clear.</AllClear>
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
          <AllClear>Every part is above its minimum shop level.</AllClear>
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

      {/* ── Parts consumed today ─────────────────────────────────────
          Read straight off the JOB_USAGE ledger, so this is what actually left
          the shelf. The subtitle is not decoration: stock is deducted when a
          job is *completed*, so a job open all afternoon shows nothing here
          until it closes, and saying so is cheaper than fielding "the parts
          panel is broken". */}
      <section>
        <SectionHeader
          title="Parts used today"
          icon={<Boxes size={18} />}
          action={<SectionLink href="/reports">Parts usage</SectionLink>}
        />
        {loadingUsage ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[3.25rem]" />
            ))}
          </div>
        ) : !partsUsage?.rows?.length ? (
          <AllClear>No parts consumed yet today.</AllClear>
        ) : (
          <div className="overflow-hidden rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)]">
            <p className="border-b border-[var(--hairline)] px-3.5 py-2 text-[11px] font-semibold text-[var(--ink-label)]">
              From jobs closed today
            </p>
            <ul className="divide-y divide-[var(--hairline)]">
              {partsUsage.rows.map((r: any) => (
                <li key={r.partId}>
                  <Link
                    href={`/inventory/parts/${r.partId}`}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5",
                      "transition-colors duration-150 ease-out hover:bg-[var(--surface)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--ink)]">
                        {r.name}
                      </span>
                      {r.partNumber && (
                        <span className="block truncate text-[11px] font-semibold text-[var(--ink-label)]">
                          {r.partNumber}
                        </span>
                      )}
                    </span>
                    <span className="numeral shrink-0 text-base text-[var(--ink)]">
                      {r.quantity}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {/* The count is across every part consumed, not just the rows
                above, so it does not shrink when the list is trimmed. */}
            <p className="border-t border-[var(--hairline)] bg-[var(--surface)] px-3.5 py-2.5 text-xs font-bold text-[var(--ink-muted)]">
              {partsUsage.totals.quantity} part
              {partsUsage.totals.quantity === 1 ? "" : "s"} used across{" "}
              {partsUsage.totals.distinctParts} line
              {partsUsage.totals.distinctParts === 1 ? "" : "s"}
            </p>
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
          <AllClear>No invoices yet — one is raised when you complete a job.</AllClear>
        ) : (
          <div className="space-y-2.5">
            {data.recentInvoices.slice(0, 3).map((inv: any) => (
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
