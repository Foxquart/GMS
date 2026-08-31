"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, X, CircleCheckBig, Clock, CircleX, Receipt } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { currency, formatDate, vehicleTypeLabel, invoiceStatusLabel } from "@/lib/format";
import {
  Input,
  Button,
  EmptyState,
  Skeleton,
  ErrorState,
  StickyControls,
} from "@/components/ui";
import { SpotTools, VEHICLE_SPOT } from "@/components/illustrations";
import { cn } from "@/lib/cn";

const FILTERS = ["ALL", "OPEN", "COMPLETED", "CANCELLED"] as const;

const FILTER_LABEL: Record<string, string> = {
  ALL: "All",
  OPEN: "Open",
  COMPLETED: "Done",
  CANCELLED: "Cancelled",
};

/**
 * Status as icon + word, not a filled pill.
 *
 * Three chunky badges per card (status, invoice, amount) gave every historical
 * job the same visual shout as a live one. Colour still carries the meaning at
 * a glance, but the word carries it for anyone who cannot use the colour — the
 * accessibility rule here is explicit that colour must never be the only
 * channel, so the label is not optional decoration.
 */
const STATUS_META: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  OPEN: { label: "Open", icon: Clock, className: "text-[#8a6a10]" },
  COMPLETED: { label: "Completed", icon: CircleCheckBig, className: "text-[var(--forest)]" },
  CANCELLED: { label: "Cancelled", icon: CircleX, className: "text-[var(--ink-label)]" },
};

const DAY_MS = 86_400_000;

/** Midnight-of-day timestamp, so jobs group by the day they were opened. */
function dayStamp(value: string | Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayHeading(stamp: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAgo = Math.round((today.getTime() - stamp) / DAY_MS);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return new Date(stamp).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

/** Rows arrive newest-first; keep that order and cut them into day columns. */
function groupByDay(jobs: any[]) {
  const groups: { stamp: number; jobs: any[] }[] = [];
  for (const job of jobs) {
    const stamp = dayStamp(job.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.stamp === stamp) last.jobs.push(job);
    else groups.push({ stamp, jobs: [job] });
  }
  return groups;
}

/** "JOB-2026-0008" is four tokens to read when only the last one varies. */
function shortJobNumber(jobNumber: string) {
  const tail = String(jobNumber ?? "").split("-").pop();
  return tail ? `#${tail}` : jobNumber;
}

export default function JobsPage() {
  const [status, setStatus] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  // The separate Search button is gone. A list that can filter itself as you
  // type should — the button was a second thing to hit for a result the field
  // could deliver on its own. Debounced so it does not fire per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const { data: jobs, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["jobs", status, search],
    queryFn: () => api<any[]>(`/api/jobs`, { params: { status, q: search || undefined } }),
  });

  // Counts come from the server: the list is capped at 100 rows, so counting
  // what is in hand would start lying the moment a workshop passes a hundred.
  const { data: counts } = useQuery({
    queryKey: ["jobs", "counts", search],
    queryFn: () =>
      api<Record<string, number>>("/api/jobs/counts", { params: { q: search || undefined } }),
  });

  const groups = groupByDay(jobs ?? []);

  return (
    <div className="space-y-5">
      {/* Pinned chrome: title, "New job", search and the status tabs. The day
          groups scroll underneath. The strapline is the one line that would
          push this past a third of a 360x640 phone, so it appears from lg,
          where the mobile top bar is gone and there is room for it. */}
      <StickyControls className="space-y-2.5">
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="tile-label text-[var(--ink-label)]">Workshop</p>
            <h1 className="mt-1 text-[clamp(1.5rem,6vw,2.25rem)] font-extrabold leading-none tracking-tight text-[var(--ink)]">
              Service jobs
            </h1>
            <p className="mt-2 hidden text-sm font-semibold text-[var(--ink-muted)] lg:block">
              Everything on the floor, grouped by the day it came in.
            </p>
          </div>
          <Link href="/jobs/new" className="shrink-0">
            <Button>
              <Plus size={18} /> New job
            </Button>
          </Link>
        </header>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs, customers or job number"
            className="pl-10 pr-11"
            // The placeholder is a hint, not a label — it disappears the moment
            // anyone types, so the accessible name is carried separately.
            aria-label="Search jobs"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className={cn(
                "absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full",
                "text-[var(--ink-label)] transition-[background-color,color] duration-150 ease-out",
                "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
              )}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Underline tabs, not a filled capsule. The capsule made four
            destinations read as one heavy control competing with the cards;
            an underline puts the weight on the word that is selected and
            spends no fill on the three that are not. Targets stay 44px tall. */}
        <div
          role="tablist"
          aria-label="Filter jobs by status"
          className="-mx-1 flex select-none items-stretch gap-1 overflow-x-auto px-1"
        >
          {FILTERS.map((f) => {
            const active = status === f;
            const count = counts?.[f];
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(f)}
                className={cn(
                  "relative shrink-0 cursor-pointer px-3 pb-2 pt-2.5 text-xs font-extrabold",
                  "min-h-11 transition-[color] duration-150 ease-out",
                  active ? "text-[var(--ink)]" : "text-[var(--ink-label)] hover:text-[var(--ink-muted)]",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {FILTER_LABEL[f]}
                  {count !== undefined && (
                    <span
                      className={cn(
                        "numeral text-[11px] leading-none",
                        active ? "text-[var(--ink-muted)]" : "text-[var(--ink-label)]",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </span>
                {active && (
                  <motion.span
                    layoutId="jobs-filter-underline"
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-[var(--forest)]"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </StickyControls>

      {/* ── The week ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-5">
          {[0, 1].map((day) => (
            <div key={day} className="space-y-2.5">
              <Skeleton className="h-3 w-32 rounded-full" />
              {Array.from({ length: day === 0 ? 3 : 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[5.25rem]" />
              ))}
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load your jobs"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      ) : !jobs?.length ? (
        <EmptyState
          title={search ? "No jobs match that search" : "No jobs here yet"}
          description={
            search
              ? "Try the customer's name or the full job number."
              : "Open a job when a vehicle comes in — parts and labour hang off it."
          }
          illustration={<SpotTools size={84} />}
          action={
            <Link href="/jobs/new">
              <Button>
                <Plus size={18} /> New job
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.stamp} className="space-y-2.5">
              {/* Quieter than the cards it introduces. The rule line that used
                  to run across here drew a horizontal stripe every few rows
                  and competed with the thing it was labelling; small uppercase
                  type does the same job with no ink. */}
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 className="tile-label text-[var(--ink-label)]" suppressHydrationWarning>
                  {dayHeading(group.stamp)}
                </h2>
                <span className="numeral text-[11px] leading-none text-[var(--ink-label)]">
                  {group.jobs.length}
                </span>
              </div>

              {group.jobs.map((job) => {
                const Spot =
                  VEHICLE_SPOT[(job.vehicleType as keyof typeof VEHICLE_SPOT) ?? "OTHER"] ??
                  VEHICLE_SPOT.OTHER;
                const meta = STATUS_META[job.status] ?? STATUS_META.OPEN;
                const StatusIcon = meta.icon;
                const cancelled = job.status === "CANCELLED";
                const vehicle = job.vehicleType
                  ? vehicleTypeLabel(job.vehicleType)
                  : "Vehicle not recorded";

                return (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className={cn(
                      "flex items-start gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5",
                      "transition-[background-color,border-color,transform,opacity] duration-150 ease-out",
                      "hover:border-[var(--hairline-strong)] hover:bg-[var(--surface)] active:scale-[0.995]",
                      // Status decides emphasis. A cancelled job is history
                      // that did not happen; it should not shout as loudly as
                      // the one on the ramp.
                      cancelled && "bg-[var(--surface)] opacity-65 hover:opacity-100",
                    )}
                  >
                    {/* The vehicle used to be named in text beside this mark,
                        which made the mark decorative. It is the only thing
                        saying "bike" now, so it carries the name itself. */}
                    <span
                      role="img"
                      aria-label={vehicle}
                      className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[var(--r-control)] bg-[var(--surface-sunk)]"
                    >
                      <Spot size={38} />
                    </span>

                    <div className="min-w-0 flex-1">
                      {/* Line one answers "whose, and how much" — the two
                          things worth a full-weight face on this screen. */}
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-extrabold text-[var(--ink)]">
                          {job.customerName}
                        </p>
                        {Number(job.total) > 0 && (
                          <span className="tabular shrink-0 text-sm font-extrabold text-[var(--ink)]">
                            {currency(job.total)}
                          </span>
                        )}
                      </div>

                      {/* Line two is why the vehicle is here. */}
                      <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                        {job.complaint || vehicle}
                      </p>

                      {/* Line three is everything you only read once you have
                          found the right row: which job, which day, what state
                          it is in, and whether the money landed. One quiet
                          line instead of three stacked badges. */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold text-[var(--ink-label)]">
                        <span className="numeral">{shortJobNumber(job.jobNumber)}</span>
                        <Dot />
                        <span suppressHydrationWarning>{formatDate(job.createdAt)}</span>
                        <Dot />
                        <span className={cn("inline-flex items-center gap-1", meta.className)}>
                          <StatusIcon size={12} aria-hidden />
                          {meta.label}
                        </span>
                        {job.invoiceId && !cancelled && (
                          <>
                            <Dot />
                            <span
                              className={cn(
                                "inline-flex items-center gap-1",
                                job.invoiceStatus === "PAID"
                                  ? "text-[var(--forest)]"
                                  : "text-[var(--ink-label)]",
                              )}
                            >
                              <Receipt size={12} aria-hidden />
                              {invoiceStatusLabel(job.invoiceStatus)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Separator between metadata items. Decorative, so it is hidden. */
function Dot() {
  return (
    <span aria-hidden="true" className="text-[var(--hairline-strong)]">
      ·
    </span>
  );
}
