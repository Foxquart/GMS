"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  IndianRupee,
  Wallet,
  Wrench,
  PackageX,
  Users,
  ArrowLeftRight,
  ArrowRight,
  ClipboardList,
  Check,
  Warehouse,
  Store,
  Boxes,
} from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  currency,
  currencyFit,
  formatDate,
  formatDateCompact,
  invoiceStatusLabel,
  pct,
  shortRef,
} from "@/lib/format";
import {
  Badge,
  BentoGrid,
  ErrorState,
  SectionHeader,
  ShareBar,
  Skeleton,
  StatTile,
  Tile,
} from "@/components/ui";
import { SpotOilCan, VEHICLE_SPOT } from "@/components/illustrations";
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
 * The two small tiles below carry counts, which are short by nature. The one
 * other currency figure on the grid — stock on hand — sits in a full-width
 * tile and gets its own budget below.
 */
const HERO_FIT = { em: 3.8 };

/**
 * The same budget for the `col-span-2` tile, which is roughly twice the width
 * of a hero and can therefore hold about twice the figure.
 *
 * This is what earns the merge: stock at cost runs to eight digits and three
 * separators in a workshop of any size, which is ~5.9em. In a half-width tile
 * that was over budget and came back as "₹2.21Cr"; here the exact figure fits,
 * and an inventory total is a number you reconcile against, not one you skim.
 */
const WIDE_FIT = { em: 7.6 };

/**
 * Budget for the two split rows inside that tile.
 *
 * Deliberately tight. These are supporting figures beside a total, sharing a
 * line with a label and a percentage, so the short form is the right answer
 * here even though the headline above them can afford to be exact — "₹57.9L"
 * next to "Shop" says everything the row is for, where an eight-digit figure
 * with paise crowds the label it belongs to.
 */
const SPLIT_FIT = { em: 3.2 };

/**
 * How many debtors the dashboard names before handing off to /customers.
 *
 * Four, matching every other feed on the page — the caps are one decision, not
 * five, so the sections read as a set of summaries rather than lists of
 * arbitrary length.
 */
const OUTSTANDING_PREVIEW = 4;

/**
 * When an open job stops being "in progress" and starts being "forgotten".
 *
 * Two days is inside anyone's working memory. A week is the point at which a
 * job on the floor has become a customer wondering where their vehicle is,
 * which is why it is also what the Active jobs footnote counts.
 */
const JOB_NUDGE_DAYS = 3;
const JOB_STALE_DAYS = 7;

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
 * These sections spend most days empty — no open jobs, nothing under its
 * minimum, nobody in debt — and each was drawing a full `EmptyState`: an 84px
 * illustration inside `py-12`, about 200px to say "all clear".
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

/**
 * "and N more of these" — the foot of every capped list on this page.
 *
 * The cap is what keeps the dashboard a dashboard, but a truncated list that
 * does not say it is truncated is worse than a long one: the owner reads four
 * debtors and thinks that is everyone. This states the remainder and hands off
 * to the page that holds it. Renders nothing when nothing was hidden.
 */
function MoreLink({ count, href, noun }: { count: number; href: string; noun: string }) {
  if (count <= 0) return null;
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-11 items-center justify-between gap-2 rounded-[var(--r-tile)]",
        "border border-[var(--hairline)] bg-[var(--surface)] px-3.5",
        "text-xs font-bold text-[var(--ink-muted)]",
        "transition-colors duration-150 ease-out",
        "hover:border-[var(--hairline-strong)] hover:text-[var(--ink)]",
      )}
    >
      <span>
        {count} more {noun}
        {count === 1 ? "" : "s"}
      </span>
      <ArrowRight size={14} className="shrink-0" />
    </Link>
  );
}

/**
 * How long an open job has been open.
 *
 * Three tiers, because two would either nag about this morning's work or say
 * nothing until a job is a fortnight old. Under three days is normal and reads
 * as plain "Open"; that tier exists so the right-hand column never collapses
 * and the rows keep one height.
 *
 * The day count is in the badge text, so the tier is never carried by colour
 * alone — and the visually-hidden phrasing spells it out for a reader who gets
 * the badge without the list heading around it.
 */
function JobAge({ days }: { days: number }) {
  // "21d", not "21 days open": the section is called Active jobs, so "open"
  // was the same word on every row, and the unit is unambiguous at a glance.
  // The full phrasing stays for screen readers, which get the badge without
  // the heading around it.
  if (days >= JOB_STALE_DAYS) {
    return (
      <Badge color="red" dot>
        {days}d<span className="sr-only"> open — needs attention</span>
      </Badge>
    );
  }
  if (days >= JOB_NUDGE_DAYS) {
    return (
      <Badge color="amber" dot>
        {days}d<span className="sr-only"> open</span>
      </Badge>
    );
  }
  return <Badge color="slate">Open</Badge>;
}

/**
 * How far a shelf sits below its own minimum, drawn rather than described.
 *
 * The track is the minimum; the fill is what is actually there. Half a bar
 * means half of what you said you wanted — a shortfall you can read at a
 * glance, where "Minimum 4 · Warehouse 12" made you do the subtraction.
 *
 * Every row in this list is already below its minimum, so the fill is one
 * colour and the *length* carries the severity — colour is never the thing
 * being read. The figures stay on screen beside it, so the bar is a second
 * encoding of a fact that is also written down, never the only one.
 */
function StockBar({ value, min }: { value: number; min: number }) {
  const pct = min > 0 ? Math.max(0, Math.min(100, (value / min) * 100)) : 100;
  return (
    <span
      aria-hidden="true"
      className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunk)]"
    >
      <span
        className="block h-full rounded-full bg-[var(--terracotta)]"
        style={{ width: `${pct}%` }}
      />
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
    // Five, not everyone. Unbounded, this section rendered one full-height row
    // per debtor — forty-five of them on a real book, longer than the rest of
    // the page put together. Its job is to name the biggest few and hand off
    // to /customers, which the header link already does.
    queryKey: ["report", "outstanding", OUTSTANDING_PREVIEW],
    queryFn: () =>
      api<any[]>("/api/reports/outstanding", {
        params: { limit: String(OUTSTANDING_PREVIEW) },
      }),
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
        {/* The footnote used to read "N open · N closed", both of which are
            already tiles on this same screen — a line of type restating what
            was beside it. Margin is a second figure, which is what a footnote
            here is for. It is materials margin: what today billed, less what
            the parts consumed cost out of inventory. Labour carries no cost
            side in this schema, so this is not margin after wages, and the
            note says "after parts" rather than implying otherwise. */}
        <StatTile
          tone="forest"
          className={HERO_TILE}
          label="Billed today"
          value={currencyFit(summary?.todayBilled, HERO_FIT)}
          // A margin is only worth stating when parts were actually consumed.
          // On a labour-only day the cost side is zero, so the figure comes
          // out at a triumphant "100% after parts" — arithmetically true, and
          // read as a claim about the business rather than as "no parts left
          // the shelf today". Below that threshold the tile says what the day
          // did instead.
          footnote={
            Number(summary?.todayBilled ?? 0) > 0 && Number(summary?.cogsToday ?? 0) > 0
              ? `${pct(summary?.profitToday, summary?.todayBilled)} after parts`
              : `${summary?.activeJobs ?? 0} open · ${summary?.completedToday ?? 0} closed`
          }
          icon={<IndianRupee size={18} />}
        />
        <StatTile
          tone="bright"
          className={HERO_TILE}
          label="Collected"
          value={currencyFit(summary?.todayCollected, HERO_FIT)}
          icon={<Wallet size={18} />}
        />

        {/* Row two is the work: what is open, and what is about to stop you
            finishing it.

            No footnotes on these two, or on Collected above. "Payments taken
            today" under COLLECTED, "Open on the floor" under ACTIVE JOBS and
            "Under the minimum" under LOW SHOP STOCK each restated the label
            directly above them — three lines of type that carried no fact. The
            footnotes that survive all carry a *second* figure: what the shelves
            cost, how the day's jobs split open/closed. */}
        <StatTile
          size="sm"
          tone="bright"
          label="Active jobs"
          value={String(summary?.activeJobs ?? 0)}
          footnote={
            Number(summary?.staleJobs ?? 0) > 0
              ? `${summary?.staleJobs} over a week`
              : undefined
          }
          icon={<Wrench size={15} />}
        />
        {/* "Low shop stock" was a lie by omission: the count behind it only
            ever looked at the shop floor, while the page it links to, and the
            badge in the nav, both count either location. Same question, three
            different numbers. The count is now the whole of it and the
            footnote says which side is short. */}
        <StatTile
          size="sm"
          tone="bright"
          label="Low stock"
          value={String(summary?.lowStockCount ?? 0)}
          // The two halves must partition the headline, not overlap it. Naming
          // the raw warehouse-short count here read as "29 shop · 24 store"
          // under a total of 48 — a reader adds those and gets 53, because a
          // part short in both places was counted twice. Pairing shop-short
          // with warehouse-ONLY splits the same 48 in two.
          footnote={
            Number(summary?.lowStockCount ?? 0) > 0
              ? `${summary?.lowShopCount ?? 0} shop · ${summary?.warehouseOnlyCount ?? 0} warehouse`
              : undefined
          }
          icon={<PackageX size={15} />}
        />

        {/* Row three is the shelves — one tile, not two.

            Split across a pair, the one figure nobody had was the total: the
            owner was adding two lakh-scale numbers in their head to answer
            "how much is sitting on my shelves". Full width also buys the room
            to print those figures exactly, where a half-width tile had to hand
            them to `currencyFit` and get "₹1.64Cr" back.

            Value leads and units follow, inverting the old pair. Combined,
            this is a money question — how much capital is on the shelves —
            and the unit counts are the supporting detail.

            Shop first, here and in the rows. This pair used to lead with
            Warehouse, so the dashboard and the inventory page put the two
            locations in opposite columns — which is exactly how someone reads
            the wrong number off the wrong side. */}
        <Tile tone="bright" className="col-span-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="tile-label text-[var(--ink-label)]">Stock on hand</span>
            <span className="shrink-0 text-[var(--ink)] opacity-45">
              <Boxes size={15} />
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="numeral truncate text-[clamp(1.5rem,6vw,2rem)]">
              {currencyFit(summary?.stockValue, WIDE_FIT)}
            </span>
            <span className="text-[11px] font-bold text-[var(--ink-label)]">at cost</span>
          </div>
          <p className="mt-0.5 text-[11px] font-semibold leading-tight text-[var(--ink-label)]">
            {units(summary?.stockUnits)} units across both locations
          </p>

          {/* Share of value, not of units — cheap bulk stock in the back room
              pulls those two apart, so the caption says which one this is. */}
          <div className="mt-3 space-y-2">
            {[
              { label: "Shop", icon: Store, value: Number(summary?.shopStockValue ?? 0), qty: summary?.shopUnits },
              { label: "Warehouse", icon: Warehouse, value: Number(summary?.warehouseStockValue ?? 0), qty: summary?.warehouseUnits },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
                    <row.icon size={12} className="shrink-0 opacity-45" />
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--ink-muted)]">
                    <span className="tabular font-extrabold text-[var(--ink)]">
                      {currencyFit(row.value, SPLIT_FIT)}
                    </span>
                    <span className="ml-1.5 tabular">
                      {pct(row.value, summary?.stockValue)}
                    </span>
                  </span>
                </div>
                <ShareBar
                  value={row.value}
                  total={Number(summary?.stockValue ?? 0)}
                  className="mt-1"
                />
                <span className="sr-only">
                  {units(row.qty)} units, {pct(row.value, summary?.stockValue)} of stock by value
                </span>
              </div>
            ))}
          </div>
        </Tile>
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
            {/* The total leads, because it is the figure the owner came for.
                Five names each carrying their own amount made them add it up
                in their head; the names below are now the top of that total
                rather than a substitute for it. */}
            <div className="rounded-[var(--r-tile)] border border-[var(--terracotta)]/25 bg-[var(--terracotta)]/8 px-4 py-3">
              <p className="numeral text-[clamp(1.5rem,6vw,2rem)] leading-none text-[var(--terracotta-hover)]">
                {currencyFit(summary?.outstanding, WIDE_FIT)}
              </p>
              <p className="mt-1.5 text-xs font-bold text-[var(--ink-muted)]">
                {summary?.outstandingCustomers ?? 0} customer
                {summary?.outstandingCustomers === 1 ? "" : "s"}
                <span className="sr-only"> owe this in total</span>
              </p>
            </div>

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

            <MoreLink
              count={(summary?.outstandingCustomers ?? 0) - outstandingCustomers.length}
              href="/customers"
              noun="customer"
            />
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
                  {/* Every row on a list called "Active jobs" is open, so a
                      badge saying "Open" carried no fact. Age does — and now
                      that the list is sorted oldest-first, the rows that most
                      need a flag are the ones at the top. The day count is in
                      the text, never colour alone. */}
                  <div className="shrink-0">
                    <JobAge days={Number(job.ageDays ?? 0)} />
                  </div>
                </Link>
              );
            })}
            <MoreLink
              count={(summary?.activeJobs ?? 0) - data.activeJobs.length}
              href="/jobs"
              noun="active job"
            />
          </div>
        )}
      </section>

      {/* ── Low shop stock ───────────────────────────────────────────────
          The tile above counts both locations; these rows deliberately do not.
          A shop shortage stops a job today, a warehouse shortage is a re-order
          for this week, and interleaving the two buries the urgent ones. The
          warehouse side gets a count and a link at the foot instead. */}
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
          <AllClear>
            {summary?.warehouseOnlyCount
              ? "The shop floor is stocked — only the warehouse is short."
              : "Every part is above its minimum."}
          </AllClear>
        ) : (
          <div className="space-y-2.5">
            {data.lowStock.map((p: any) => {
              // Short on the floor with stock in the back is a two-minute walk,
              // not a purchase order. The row used to state that fact and leave
              // the owner to go and find the transfer screen themselves.
              const coverable = p.warehouseStock > 0;
              return (
                <div key={p.id} className={cn(ROW, "relative")}>
                  {/* Stretched link: the whole card opens the part, while the
                      Transfer control above it stays independently tappable.
                      A button nested inside an anchor would be invalid, and
                      splitting the row into two targets would lose the big
                      one. */}
                  <Link
                    href={`/inventory/parts/${p.id}`}
                    className="absolute inset-0 rounded-[var(--r-card)]"
                  >
                    <span className="sr-only">{p.name}</span>
                  </Link>
                  <Plate tone="ochre">
                    <SpotOilCan size={34} />
                  </Plate>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[var(--ink)]">{p.name}</p>
                    {/* "Shop 0/3 · Warehouse 53", not "0 of 3 in shop · 53
                        in warehouse". Same four figures, half the words, and
                        the location leads so the pair scans as a column. */}
                    <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                      Shop {p.shopStock}/{p.minimumShopStock}
                      {coverable && ` · Warehouse ${p.warehouseStock}`}
                    </p>
                    <span className="mt-1.5 block max-w-[10rem]">
                      <StockBar value={p.shopStock} min={p.minimumShopStock} />
                    </span>
                  </div>
                  {coverable ? (
                    <Link
                      href="/inventory/transfers"
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "relative z-10 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full",
                        "border border-[var(--hairline)] bg-[var(--surface-bright)] px-3",
                        "text-xs font-bold text-[var(--ink)]",
                        "transition-colors duration-150 ease-out hover:border-[var(--hairline-strong)]",
                      )}
                    >
                      <ArrowLeftRight size={13} aria-hidden="true" />
                      Move
                      <span className="sr-only"> {p.name} from the warehouse to the shop</span>
                    </Link>
                  ) : (
                    // Nothing behind it either — this one has to be ordered,
                    // and saying so is more use than repeating the zero.
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="numeral text-lg text-[var(--ink)]">{p.shopStock}</span>
                      <span className="tile-label text-[var(--ink-label)]">Order</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!isLoading && Number(summary?.warehouseOnlyCount ?? 0) > 0 && (
          <Link
            href="/inventory/low-stock"
            className={cn(
              "mt-2.5 flex min-h-11 items-center justify-between gap-2 rounded-[var(--r-tile)]",
              "border border-[var(--hairline)] bg-[var(--surface)] px-3.5",
              "text-xs font-bold text-[var(--ink-muted)]",
              "transition-colors duration-150 ease-out",
              "hover:border-[var(--hairline-strong)] hover:text-[var(--ink)]",
            )}
          >
            <span>
              {summary?.warehouseOnlyCount} more short in the warehouse only
            </span>
            <ArrowRight size={14} className="shrink-0" />
          </Link>
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
                above, so it does not shrink when the list is trimmed.
                "6 used · 4 parts" rather than "6 parts used across 4 lines" —
                "lines" was the database's word for it, not the workshop's. */}
            <p className="border-t border-[var(--hairline)] bg-[var(--surface)] px-3.5 py-2.5 text-xs font-bold text-[var(--ink-muted)]">
              {partsUsage.totals.quantity} used
              {partsUsage.totals.distinctParts !== partsUsage.totals.quantity &&
                ` · ${partsUsage.totals.distinctParts} part${
                  partsUsage.totals.distinctParts === 1 ? "" : "s"
                }`}
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
          <Skeleton className="h-[11rem] rounded-[var(--r-card)]" />
        ) : !data?.recentInvoices?.length ? (
          <AllClear>No invoices yet — one is raised when you complete a job.</AllClear>
        ) : (
          // A record of what already happened, not something to act on — so
          // rows in one bordered list rather than four illustrated cards. The
          // illustrated card is the right weight for a section the owner has
          // to *do* something about, and spending it here made a receipt log
          // look as urgent as an unpaid debt.
          <div className="overflow-hidden rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)]">
            <ul className="divide-y divide-[var(--hairline)]">
              {data.recentInvoices.map((inv: any) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="flex min-h-[3.25rem] items-center gap-3 px-3.5 py-2.5 transition-colors duration-150 ease-out hover:bg-[var(--surface)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--ink)]">
                        {inv.customerName}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-[var(--ink-label)]">
                        {shortRef(inv.invoiceNumber)} · {formatDateCompact(inv.createdAt)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-extrabold text-[var(--ink)]">
                      {currency(inv.total)}
                    </span>
                    <Badge
                      className="shrink-0"
                      color={
                        inv.status === "PAID"
                          ? "green"
                          : inv.status === "PARTIALLY_PAID"
                            ? "amber"
                            : "slate"
                      }
                      dot
                    >
                      {invoiceStatusLabel(inv.status)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
