"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  IndianRupee,
  Wrench,
  Boxes,
  Car,
  Wallet,
  Scissors,
} from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  currency,
  paymentMethodLabel,
  pct,
  turnaround,
  vehicleTypeLabel,
} from "@/lib/format";
import {
  CircleButton,
  ErrorState,
  SectionHeader,
  ShareBar,
  Skeleton,
  StickyControls,
  Tile,
} from "@/components/ui";
import { useGoBack } from "@/hooks/use-go-back";
import { cn } from "@/lib/cn";

const PERIODS = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "yearly", label: "Year" },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

/** Parts rows shown before the list asks to be expanded. */
const PARTS_PREVIEW = 10;

/**
 * The workshop report, moved off the dashboard.
 *
 * It sat under eight metric tiles that already stated four of its six figures,
 * so on the Today tab it was the same numbers twice — and the three tabs that
 * were *not* duplicated, Week / Month / Year, were the reason to keep it. They
 * are the whole page now, rather than the fourth thing to scroll past on a
 * screen about today.
 *
 * Three bands, in the order the questions get asked: what the money did, what
 * the work did, what the stock did. The figures used to be one eleven-row card
 * mixing money with counts; split in two, each card answers one question and
 * fits on a screen.
 */
export default function ReportsPage() {
  const goBack = useGoBack("/dashboard");
  const [period, setPeriod] = useState<PeriodId>("daily");
  const [partsSort, setPartsSort] = useState<"quantity" | "charged">("quantity");
  const [showAllParts, setShowAllParts] = useState(false);

  const { data: report, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["report", period],
    queryFn: () => api<any>(`/api/reports/${period}`),
  });

  // Same tabs drive both cards — the breakdown of a period's consumption
  // belongs beside that period's figures, not on a page of its own.
  const {
    data: usage,
    isLoading: loadingUsage,
    isError: usageIsError,
    error: usageError,
    refetch: refetchUsage,
  } = useQuery({
    queryKey: ["report", "parts-usage", period],
    queryFn: () => api<any>("/api/reports/parts-usage", { params: { period } }),
  });

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "Today";
  const inPeriod = period === "daily" ? "today" : `this ${periodLabel.toLowerCase()}`;

  // The server orders by quantity; sorting by value is a view of the same rows
  // and does not need a round trip.
  const partRows = useMemo(() => {
    const rows = [...(usage?.rows ?? [])];
    if (partsSort === "charged") rows.sort((a: any, b: any) => b.charged - a.charged);
    return rows;
  }, [usage?.rows, partsSort]);

  const visibleParts = showAllParts ? partRows : partRows.slice(0, PARTS_PREVIEW);

  const splitTotal =
    Number(report?.revenueSplit?.labour ?? 0) + Number(report?.revenueSplit?.parts ?? 0);
  const jobsIn = report?.vehicleMix?.reduce((s: number, r: any) => s + r.count, 0) ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-start gap-3">
        <CircleButton onDark={false} onClick={goBack} aria-label="Back" className="mt-1">
          <ArrowLeft size={18} />
        </CircleButton>
        <div className="min-w-0">
          <p className="tile-label text-[var(--ink-label)]">Workshop</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-muted)]">
            What the workshop billed, collected and got through.
          </p>
        </div>
      </header>

      {/* The tabs drive six sections now, not one, so they are page chrome
          rather than part of the first card. Left inline they scrolled away,
          and changing period after reading to the bottom meant scrolling all
          the way back up. */}
      <StickyControls>
        <div
          role="tablist"
          aria-label="Report period"
          className="flex select-none rounded-full bg-[var(--surface-sunk)] p-1"
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
                    layoutId="reports-period-pill"
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
      </StickyControls>

      {/* ══ Band A · Money ═══════════════════════════════════════════════ */}
      <section>
        <SectionHeader title={`${periodLabel}’s money`} icon={<IndianRupee size={18} />} />
        {isLoading ? (
          <Skeleton className="h-[15rem] rounded-[var(--r-card)]" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load this report"
            message={errorMessage(error)}
            reference={errorReference(error)}
            onRetry={() => refetch()}
          />
        ) : (
          <FigureCard
            rows={[
              { label: "Billed", value: currency(report?.billed) },
              { label: "Collected", value: currency(report?.collected) },
              {
                // Unpaid credit across every ISSUED / PARTIALLY_PAID invoice.
                // Unlike the rest of this card it is a running balance, not a
                // flow, so it is deliberately NOT scoped to the selected
                // period — money owed does not stop being owed because you
                // switched the tab to Today.
                label: "Outstanding credit",
                note: "All time",
                value: currency(report?.outstanding),
              },
              {
                // Billed less what the parts consumed cost out of inventory.
                // Labour has no cost side in this schema — no wages, no
                // overhead, no rent — so this is materials margin and the note
                // says so rather than letting "profit" be read as the bottom
                // line.
                label: "Gross profit",
                note: "After parts cost, before labour and overheads",
                value: currency(report?.grossProfit),
                strong: true,
              },
              {
                label: "Margin",
                note: "Of billed",
                value: pct(report?.grossProfit, report?.billed),
              },
            ]}
          />
        )}
      </section>

      {!isLoading && !isError && (
        <>
          <Breakdown
            title="Where the money came from"
            icon={<Scissors size={18} />}
            // Line items are pre-discount while `billed` is post-discount, so
            // these two will not sum to the figure above. The header states
            // this total on its own terms instead of implying they reconcile.
            caption={`${currency(splitTotal)} of work booked, before discount`}
            total={splitTotal}
            empty={`Nothing billed ${inPeriod}.`}
            rows={[
              { key: "labour", label: "Labour", value: Number(report?.revenueSplit?.labour ?? 0) },
              { key: "parts", label: "Parts", value: Number(report?.revenueSplit?.parts ?? 0) },
            ]}
            format={currency}
          />

          <Breakdown
            title="How it was paid"
            icon={<Wallet size={18} />}
            caption={`${currency(report?.collected)} collected ${inPeriod}`}
            total={Number(report?.collected ?? 0)}
            empty={`No payments taken ${inPeriod}.`}
            // Only methods that were actually used — five zero rows is noise.
            rows={(report?.paymentMix ?? [])
              .filter((m: any) => m.total > 0)
              .sort((a: any, b: any) => b.total - a.total)
              .map((m: any) => ({
                key: m.method,
                label: paymentMethodLabel(m.method),
                value: m.total,
              }))}
            format={currency}
          />
        </>
      )}

      {/* ══ Band B · Work ════════════════════════════════════════════════ */}
      <section>
        <SectionHeader title={`${periodLabel}’s work`} icon={<Wrench size={18} />} />
        {isLoading ? (
          <Skeleton className="h-[12rem] rounded-[var(--r-card)]" />
        ) : isError ? null : (
          <FigureCard
            rows={[
              { label: "Jobs completed", value: String(report?.jobsCompleted ?? 0) },
              { label: "Invoices issued", value: String(report?.invoicesCount ?? 0) },
              {
                // Calendar time from intake to completion, nights and weekends
                // included — not labour hours, which nothing in the schema
                // records. The sample is stated because a job completed before
                // this column existed counts above but cannot contribute here.
                label: "Avg turnaround",
                note:
                  report?.turnaroundSample > 0
                    ? `Open → completed · across ${report.turnaroundSample} job${
                        report.turnaroundSample === 1 ? "" : "s"
                      }`
                    : "Open → completed",
                value: turnaround(report?.avgTurnaroundHours),
              },
              { label: "New customers", value: String(report?.newCustomers ?? 0) },
            ]}
          />
        )}
      </section>

      {!isLoading && !isError && (
        <Breakdown
          title="What came in"
          icon={<Car size={18} />}
          caption={`${jobsIn} job${jobsIn === 1 ? "" : "s"} opened ${inPeriod}`}
          total={jobsIn}
          empty={`No jobs opened ${inPeriod}.`}
          rows={(report?.vehicleMix ?? []).map((v: any) => ({
            key: v.vehicleType,
            label: v.vehicleType === "UNKNOWN" ? "No vehicle" : vehicleTypeLabel(v.vehicleType),
            value: v.count,
          }))}
          format={(n: number) => String(n)}
        />
      )}

      {/* ══ Band C · Stock ═══════════════════════════════════════════════
          Qty, cost and charged side by side. Cost is what the units were worth
          out of inventory — read from each movement's own snapshot, so it does
          not move when a part is re-priced; charged is what the customer paid
          for them. They are different questions and the gap between the two
          columns is the margin on parts, which is the reason to print both. */}
      <section>
        <SectionHeader
          title={`Parts used — ${periodLabel}`}
          icon={<Boxes size={18} />}
          action={
            usage?.totals ? (
              <span className="tile-label text-[var(--ink-label)]">
                {usage.totals.quantity} used
              </span>
            ) : null
          }
        />

        {loadingUsage ? (
          <Skeleton className="h-56 rounded-[var(--r-card)]" />
        ) : usageIsError ? (
          <ErrorState
            title="Couldn't load parts usage"
            message={errorMessage(usageError)}
            reference={errorReference(usageError)}
            onRetry={() => refetchUsage()}
          />
        ) : !usage?.rows?.length ? (
          <Tile tone="cream" className="p-5 text-center">
            <p className="text-sm font-bold text-[var(--ink)]">No parts consumed {inPeriod}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--ink-muted)]">
              Parts are counted here when the job that used them is completed.
            </p>
          </Tile>
        ) : (
          <>
            {/* The only ordering choice on the page: most units, or most
                money. They answer different questions — what to re-order
                versus what pays — and the sort is over rows already loaded. */}
            <div className="mb-2.5 flex gap-1.5">
              {(
                [
                  { id: "quantity", label: "By quantity" },
                  { id: "charged", label: "By value" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={partsSort === s.id}
                  onClick={() => setPartsSort(s.id)}
                  className={cn(
                    "min-h-9 cursor-pointer rounded-full border px-3 text-xs font-bold",
                    "transition-colors duration-150 ease-out",
                    partsSort === s.id
                      ? "border-transparent bg-[var(--forest)] text-[var(--ink-on-dark)]"
                      : "border-[var(--hairline)] bg-[var(--surface-bright)] text-[var(--ink-muted)] hover:text-[var(--ink)]",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Tile tone="cream" className="p-0">
              {/* The table scrolls inside its own box on a narrow phone rather
                  than making the page scroll sideways. */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] border-collapse text-sm">
                  <caption className="sr-only">
                    Parts consumed {inPeriod}, most{" "}
                    {partsSort === "quantity" ? "used" : "valuable"} first
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--hairline)]">
                      <th className="px-4 py-2.5 text-left tile-label text-[var(--ink-label)]">
                        Part
                      </th>
                      <th className="px-3 py-2.5 text-right tile-label text-[var(--ink-label)]">
                        Qty
                      </th>
                      <th className="px-3 py-2.5 text-right tile-label text-[var(--ink-label)]">
                        Cost
                      </th>
                      <th className="px-4 py-2.5 text-right tile-label text-[var(--ink-label)]">
                        Charged
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hairline)]">
                    {visibleParts.map((r: any) => (
                      <tr key={r.partId}>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/inventory/parts/${r.partId}`}
                            className="block max-w-[14rem] truncate font-bold text-[var(--ink)] hover:underline"
                          >
                            {r.name}
                          </Link>
                          {r.partNumber && (
                            <span className="block truncate text-[11px] font-semibold text-[var(--ink-label)]">
                              {r.partNumber}
                            </span>
                          )}
                        </td>
                        <td className="numeral px-3 py-2.5 text-right text-[var(--ink)]">
                          {r.quantity}
                        </td>
                        <td className="tabular px-3 py-2.5 text-right font-semibold text-[var(--ink-muted)]">
                          {currency(r.cost)}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right font-extrabold text-[var(--ink)]">
                          {currency(r.charged)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {/* Totals are the period's, not the visible rows' — the
                        service computes them before any trim, so collapsing
                        the list never changes the figures under it. */}
                    <tr className="border-t-2 border-[var(--hairline-strong)]">
                      <td className="px-4 py-3 text-xs font-extrabold text-[var(--ink)]">
                        {usage.totals.distinctParts} line
                        {usage.totals.distinctParts === 1 ? "" : "s"}
                      </td>
                      <td className="numeral px-3 py-3 text-right text-[var(--ink)]">
                        {usage.totals.quantity}
                      </td>
                      <td className="tabular px-3 py-3 text-right font-bold text-[var(--ink-muted)]">
                        {currency(usage.totals.cost)}
                      </td>
                      <td className="tabular px-4 py-3 text-right font-extrabold text-[var(--ink)]">
                        {currency(usage.totals.charged)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Tile>

            {partRows.length > PARTS_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllParts((v) => !v)}
                className="mt-2.5 min-h-11 w-full cursor-pointer rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface)] text-xs font-bold text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:border-[var(--hairline-strong)] hover:text-[var(--ink)]"
              >
                {showAllParts
                  ? `Show top ${PARTS_PREVIEW}`
                  : `Show all ${partRows.length} parts`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/**
 * A card of figures: label on the left, number on the right, one per row.
 *
 * `note` is the small caption under a label — "All time" on a balance that
 * ignores the period, the sample size behind an average, what a percentage is
 * a percentage of. It replaced a boolean that could only ever say one thing.
 */
function FigureCard({
  rows,
}: {
  rows: { label: string; value: string; note?: string; strong?: boolean }[];
}) {
  return (
    <Tile tone="cream" className="p-0">
      <div className="divide-y divide-[var(--hairline)]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate text-sm text-[var(--ink)]",
                  r.strong ? "font-extrabold" : "font-bold",
                )}
              >
                {r.label}
              </span>
              {r.note && (
                <span className="block text-[11px] font-semibold text-[var(--ink-label)]">
                  {r.note}
                </span>
              )}
            </span>
            <span
              className={cn(
                "tabular shrink-0 text-[var(--ink)]",
                r.strong ? "text-base font-extrabold" : "text-sm font-extrabold",
              )}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </Tile>
  );
}

/**
 * A set of parts of a whole, one labelled row each.
 *
 * Deliberately not a stacked bar or a donut. See `ShareBar` for the full
 * reasoning: this palette has one hue that can carry a mark legibly, so length
 * is the encoding and the label beside it is the identity. Every row states
 * its own value and share as text, so nothing depends on the bar.
 */
function Breakdown({
  title,
  icon,
  caption,
  rows,
  total,
  empty,
  format,
}: {
  title: string;
  icon: React.ReactNode;
  caption: string;
  rows: { key: string; label: string; value: number }[];
  total: number;
  empty: string;
  format: (n: number) => string;
}) {
  return (
    <section>
      <SectionHeader title={title} icon={icon} />
      {!rows.length || total <= 0 ? (
        <Tile tone="cream" className="p-5 text-center">
          <p className="text-sm font-bold text-[var(--ink-muted)]">{empty}</p>
        </Tile>
      ) : (
        <Tile tone="cream" className="space-y-3 p-4">
          <p className="text-[11px] font-semibold text-[var(--ink-label)]">{caption}</p>
          {rows.map((r) => (
            <div key={r.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-bold text-[var(--ink)]">
                  {r.label}
                </span>
                <span className="shrink-0 text-sm">
                  <span className="tabular font-extrabold text-[var(--ink)]">
                    {format(r.value)}
                  </span>
                  <span className="tabular ml-1.5 text-xs font-semibold text-[var(--ink-muted)]">
                    {pct(r.value, total)}
                  </span>
                </span>
              </div>
              <ShareBar value={r.value} total={total} className="mt-1.5" />
            </div>
          ))}
        </Tile>
      )}
    </section>
  );
}
