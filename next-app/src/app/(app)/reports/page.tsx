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
  ReceiptText,
  Boxes,
} from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { currency } from "@/lib/format";
import { ErrorState, SectionHeader, Skeleton, Tile } from "@/components/ui";
import { cn } from "@/lib/cn";

const PERIODS = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "yearly", label: "Year" },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

/**
 * The workshop report, moved off the dashboard.
 *
 * It sat under eight metric tiles that already stated four of its six figures,
 * so on the Today tab it was the same numbers twice — and the three tabs that
 * were *not* duplicated, Week / Month / Year, were the reason to keep it. They
 * are the whole page now, rather than the fourth thing to scroll past on a
 * screen about today.
 */
export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodId>("daily");

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

  // Every row here is the same kind of thing — a figure for the chosen period
  // — so every chip is the same neutral plate. The icon is what tells the rows
  // apart.
  const rows = [
    { label: "Billed", value: currency(report?.billed), icon: IndianRupee },
    { label: "Collected", value: currency(report?.collected), icon: Wallet },
    {
      // Unpaid credit across every ISSUED / PARTIALLY_PAID invoice. Unlike
      // most rows here this is a running balance, not a flow, so it is
      // deliberately NOT scoped to the selected period — money owed does not
      // stop being owed because you switched the tab to Today. Tagged so the
      // figure cannot be misread as "owed today".
      label: "Outstanding credit",
      value: currency(report?.outstanding),
      icon: HandCoins,
      allTime: true,
    },
    { label: "Jobs completed", value: String(report?.jobsCompleted ?? 0), icon: Wrench },
    { label: "Invoices issued", value: String(report?.invoicesCount ?? 0), icon: FileText },
    { label: "Parts consumed", value: String(report?.partsConsumed ?? 0), icon: PackageX },
  ];

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "Today";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="tile-label text-[var(--ink-label)]">Workshop</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
          Reports
        </h1>
        <p className="mt-1 text-sm font-semibold text-[var(--ink-muted)]">
          What the workshop billed, collected and got through.
        </p>
      </header>

      <section>
        <SectionHeader title={`${periodLabel}’s figures`} icon={<ReceiptText size={18} />} />

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

        {isLoading ? (
          <Skeleton className="h-[19.5rem] rounded-[var(--r-card)]" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load this report"
            message={errorMessage(error)}
            reference={errorReference(error)}
            onRetry={() => refetch()}
          />
        ) : (
          <Tile tone="cream" className="p-0">
            <div className="divide-y divide-[var(--hairline)]">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface-sunk)] text-[var(--ink)]">
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

      {/* ── Parts usage ───────────────────────────────────────────────
          Qty, cost and charged side by side. Cost is what the units were worth
          out of inventory; charged is what the customer paid for them. They
          are different questions and the gap between the two columns is the
          margin on parts, which is the reason to print both. */}
      <section>
        <SectionHeader
          title="Parts usage"
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
            <p className="text-sm font-bold text-[var(--ink)]">
              No parts consumed {period === "daily" ? "today" : `this ${periodLabel.toLowerCase()}`}
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--ink-muted)]">
              Parts are counted here when the job that used them is completed.
            </p>
          </Tile>
        ) : (
          <Tile tone="cream" className="p-0">
            {/* The table scrolls inside its own box on a narrow phone rather
                than making the page scroll sideways. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-sm">
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
                  {usage.rows.map((r: any) => (
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
        )}
      </section>
    </div>
  );
}
