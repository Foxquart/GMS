"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, FileText } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  currency,
  formatDate,
  jobStatusLabel,
  vehicleTypeLabel,
  invoiceStatusLabel,
} from "@/lib/format";
import {
  Badge,
  Input,
  Button,
  EmptyState,
  Skeleton,
  ErrorState,
  StickyControls,
} from "@/components/ui";
import { SpotTools, VEHICLE_SPOT } from "@/components/illustrations";
import { cn } from "@/lib/cn";

const FILTERS = ["ALL", "OPEN", "COMPLETED", "CANCELLED"];

const FILTER_LABEL: Record<string, string> = {
  ALL: "All",
  OPEN: "Open",
  COMPLETED: "Done",
  CANCELLED: "Cancelled",
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

export default function JobsPage() {
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const { data: jobs, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["jobs", status, search],
    queryFn: () => api<any[]>(`/api/jobs`, { params: { status, q: search || undefined } }),
  });

  const badgeColor = (s: string) =>
    s === "COMPLETED" ? "green" : s === "CANCELLED" ? "red" : "amber";

  const invoiceBadgeColor = (s: string) =>
    s === "PAID" ? "green" : s === "PARTIALLY_PAID" ? "amber" : "slate";

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

        <div className="flex gap-2.5">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Customer or job number"
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
              aria-label="Search jobs"
            />
          </div>
          <Button variant="secondary" onClick={() => setSearch(q)}>
            Search
          </Button>
        </div>

        <div
          role="tablist"
          aria-label="Filter jobs by status"
          className="flex select-none rounded-full bg-[var(--surface-sunk)] p-1"
        >
          {FILTERS.map((f) => {
            const active = status === f;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(f)}
                className={cn(
                  "relative isolate flex-1 cursor-pointer rounded-full px-2 py-2 text-xs font-extrabold",
                  "transition-[color] duration-150 ease-out",
                  active
                    ? "text-[var(--ink-on-dark)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="jobs-filter-pill"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-[var(--forest)]"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                {FILTER_LABEL[f]}
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
              <Skeleton className="h-4 w-full max-w-xs rounded-full" />
              {Array.from({ length: day === 0 ? 3 : 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
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
              <div className="flex items-center gap-3 px-1">
                <h2
                  className="shrink-0 text-sm font-extrabold tracking-tight text-[var(--ink)]"
                  suppressHydrationWarning
                >
                  {dayHeading(group.stamp)}
                </h2>
                <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-[var(--hairline-strong)]" />
                <span className="tile-label shrink-0 text-[var(--ink-label)]">
                  {group.jobs.length} {group.jobs.length === 1 ? "job" : "jobs"}
                </span>
              </div>

              {group.jobs.map((job) => {
                const Spot =
                  VEHICLE_SPOT[(job.vehicleType as keyof typeof VEHICLE_SPOT) ?? "OTHER"] ??
                  VEHICLE_SPOT.OTHER;
                return (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className={cn(
                      "flex items-start gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5",
                      "transition-[background-color,border-color,transform] duration-150 ease-out",
                      "hover:border-[var(--hairline-strong)] hover:bg-[var(--surface)] active:scale-[0.995]",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[var(--r-control)] bg-[var(--surface-sunk)]"
                    >
                      <Spot size={42} />
                    </span>

                    {/* Identity — truncates rather than pushing the column right. */}
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                        {job.customerName}
                      </p>
                      <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                        {job.jobNumber} · {formatDate(job.createdAt)}
                      </p>
                      <p className="truncate text-xs text-[var(--ink-label)]">
                        {job.vehicleType ? vehicleTypeLabel(job.vehicleType) : "Vehicle not recorded"}
                        {job.complaint ? ` · ${job.complaint}` : ""}
                      </p>
                    </div>

                    {/* Status — fixed column, badges never wrap. */}
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge color={badgeColor(job.status)} dot>
                        {jobStatusLabel(job.status)}
                      </Badge>
                      {job.invoiceId && (
                        <Badge
                          color={invoiceBadgeColor(job.invoiceStatus)}
                          className="px-2 text-[10px] tracking-normal"
                        >
                          <FileText size={10} />
                          {invoiceStatusLabel(job.invoiceStatus)}
                        </Badge>
                      )}
                      {Number(job.total) > 0 && (
                        <span className="tabular text-sm font-extrabold text-[var(--ink)]">
                          {currency(job.total)}
                        </span>
                      )}
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
