"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Database, HardDrive, Layers, RefreshCw, Rows3, Trash2 } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { bytes, bytesParts } from "@/lib/format";
import {
  Badge,
  BentoGrid,
  Button,
  Card,
  ErrorState,
  SectionHeader,
  Skeleton,
  StatTile,
  type Tone,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatWhen } from "../_status";

const QUERY_KEY = ["superadmin-storage"];

/**
 * One fill per bucket, reused by the bar and its legend so a colour means the
 * same thing in both. System overhead is deliberately the neutral well fill:
 * it is the part of the total nobody chose and nobody can shrink.
 */
const BUCKET_FILL: Record<string, string> = {
  business: "bg-[var(--forest)]",
  operational: "bg-[var(--ochre)]",
  other: "bg-[var(--terracotta)]",
  overhead: "bg-[var(--hairline-strong)]",
  data: "bg-[var(--forest)]",
  indexes: "bg-[var(--sage)]",
  toast: "bg-[var(--ochre)]",
};

/**
 * One bar plus its legend, shared by both breakdowns — the same total split by
 * what the data means and by what form it takes. Segments narrower than a
 * hairline are dropped from the bar but kept in the legend, so a 0.1% slice is
 * still readable as a number instead of an invisible sliver.
 */
function Composition({
  segments,
}: {
  segments: { key: string; label: string; bytes: number; pct: number }[];
}) {
  return (
    <>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-[var(--surface-sunk)]"
        role="img"
        aria-label={segments.map((s) => `${s.label} ${s.pct.toFixed(1)}%`).join(", ")}
      >
        {segments
          .filter((s) => s.pct > 0)
          .map((s) => (
            <div
              key={s.key}
              className={BUCKET_FILL[s.key]}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${bytes(s.bytes)}`}
            />
          ))}
      </div>
      <dl className="mt-3 divide-y divide-[var(--hairline)]">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn("h-2.5 w-2.5 shrink-0 rounded-full", BUCKET_FILL[s.key])}
              />
              <span className="truncate text-sm font-bold text-[var(--ink)]">{s.label}</span>
            </dt>
            <dd className="flex shrink-0 items-baseline gap-3">
              <span className="tabular text-sm font-extrabold text-[var(--ink)]">
                {bytes(s.bytes)}
              </span>
              <span className="tabular w-12 text-right text-xs font-bold text-[var(--ink-muted)]">
                {s.pct.toFixed(1)}%
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Headroom, coloured by how little of it is left. */
function usageTone(pct: number | null): Tone {
  if (pct == null) return "cream";
  if (pct >= 90) return "terracotta";
  if (pct >= 70) return "ochre";
  return "sage";
}

export default function SuperadminStoragePage() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api<any>("/api/superadmin/storage"),
    // The server caches the sweep for a minute; matching it here stops a tab
    // switch from asking again. Nothing on this page polls — a size sweep on a
    // timer would hold a scale-to-zero database awake just to watch it idle.
    staleTime: 60_000,
  });

  /** Re-measures for real, rather than re-reading the cached snapshot. */
  const remeasure = async () => {
    setRefreshing(true);
    try {
      queryClient.setQueryData(QUERY_KEY, await api<any>("/api/superadmin/storage?refresh=1"));
    } finally {
      setRefreshing(false);
    }
  };

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
          Storage
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          How much of the database is used, what is using it, and how much room is left.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={remeasure}
        disabled={refreshing}
        className="self-start"
      >
        <RefreshCw size={14} className={refreshing ? "gear-spin" : undefined} />
        {refreshing ? "Measuring…" : "Re-measure"}
      </Button>
    </div>
  );

  if (isError && !data) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState
          title="Couldn't measure the database"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading) return <StorageSkeleton />;

  const usedPct: number | null = data?.usedPct ?? null;
  const size = bytesParts(data?.databaseBytes);
  const tablesShare =
    data?.databaseBytes > 0 ? (data.tablesBytes / data.databaseBytes) * 100 : 0;

  return (
    <div className="space-y-5">
      {header}

      <BentoGrid className="sm:grid-cols-4">
        <StatTile
          className="col-span-2 min-h-[132px]"
          tone={usageTone(usedPct)}
          label="Database size"
          value={size.value}
          unit={size.unit}
          icon={<Database size={18} />}
          footnote={
            usedPct == null
              ? "No storage budget configured"
              : `${usedPct.toFixed(1)}% of ${bytes(data.capacityBytes)} · ${bytes(data.freeBytes)} free`
          }
        />
        <StatTile
          tone="bright"
          label="Your tables"
          value={bytesParts(data?.tablesBytes).value}
          unit={bytesParts(data?.tablesBytes).unit}
          icon={<Layers size={16} />}
          footnote={`${tablesShare.toFixed(1)}% of the database · ${data?.totals?.tables ?? 0} tables`}
        />
        <StatTile
          tone="cream"
          label="Rows stored"
          value={Number(data?.totals?.rows ?? 0).toLocaleString("en-IN")}
          icon={<Rows3 size={16} />}
          footnote={
            data?.totals?.deadRows == null
              ? "Dead rows not reported by this engine"
              : `${Number(data.totals.deadRows).toLocaleString("en-IN")} dead rows awaiting vacuum`
          }
        />
      </BentoGrid>

      {/* ── Headroom ─────────────────────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeader title="Headroom" icon={<HardDrive size={17} />} />
        {usedPct == null ? (
          <p className="text-sm font-semibold leading-relaxed text-[var(--ink-muted)]">
            A managed database cannot be asked how large its plan lets it grow — the limit
            lives in the provider&apos;s billing, not in the database. Set{" "}
            <code className="rounded bg-[var(--surface-sunk)] px-1.5 py-0.5 text-xs font-bold text-[var(--ink)]">
              DB_CAPACITY_BYTES
            </code>{" "}
            to your plan&apos;s limit — for example{" "}
            <code className="rounded bg-[var(--surface-sunk)] px-1.5 py-0.5 text-xs font-bold text-[var(--ink)]">
              10GB
            </code>{" "}
            — and this becomes a percentage with a projection behind it.
          </p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="numeral text-[clamp(1.5rem,6vw,2rem)] text-[var(--ink)]">
                {usedPct.toFixed(1)}%
              </span>
              <span className="tabular text-sm font-bold text-[var(--ink-muted)]">
                {bytes(data.databaseBytes)} of {bytes(data.capacityBytes)}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.round(usedPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Share of the storage budget in use"
              className="h-3 overflow-hidden rounded-full bg-[var(--surface-sunk)]"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  usedPct >= 90
                    ? "bg-[var(--terracotta)]"
                    : usedPct >= 70
                      ? "bg-[var(--ochre)]"
                      : "bg-[var(--forest)]",
                )}
                style={{ width: `${Math.max(0.5, Math.min(100, usedPct))}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-[var(--ink-muted)]">
              {bytes(data.freeBytes)} still free.
            </p>
          </>
        )}

        {/* Storage is not the only ceiling. A serverless deployment runs out of
            connections long before it runs out of disk, and that limit is one
            the database will actually answer for. */}
        {data?.connections && (
          <div className="mt-5 border-t border-[var(--hairline)] pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="tile-label text-[var(--ink-label)]">Connections in use</span>
              <span className="tabular text-sm font-extrabold text-[var(--ink)]">
                {data.connections.inUse} of {data.connections.max}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.round(data.connections.pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Share of the connection limit in use"
              className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-sunk)]"
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  data.connections.pct >= 90
                    ? "bg-[var(--terracotta)]"
                    : data.connections.pct >= 70
                      ? "bg-[var(--ochre)]"
                      : "bg-[var(--forest)]",
                )}
                style={{ width: `${Math.max(1, Math.min(100, data.connections.pct))}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── What is using the space ──────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeader title="What's using the space" icon={<Layers size={17} />} />

        <Composition segments={data?.buckets ?? []} />

        <p className="mt-3 text-xs font-semibold leading-relaxed text-[var(--ink-muted)]">
          System overhead is Postgres&apos;s own catalogue and bookkeeping. On a young database
          it is most of the total — it does not grow with your data, so its share shrinks as
          the workshop fills the tables.
        </p>
      </Card>

      {/* ── The same total, split by form rather than by meaning ─────── */}
      <Card className="p-5">
        <SectionHeader title="By storage kind" icon={<Boxes size={17} />} />
        <Composition segments={data?.kinds ?? []} />
        <p className="mt-3 text-xs font-semibold leading-relaxed text-[var(--ink-muted)]">
          Indexes make queries fast and cost space to do it. Every index reserves a page
          whether or not it holds anything, so on a nearly empty database they dominate — and
          the share is only worth acting on once the tables have real data behind them.
        </p>
      </Card>

      {/* ── Per table ────────────────────────────────────────────────── */}
      <Card className="p-5">
        <SectionHeader title="By table" icon={<Database size={17} />} />
        <div className="divide-y divide-[var(--hairline)]">
          {(data?.tables ?? []).map((t: any) => (
            <div key={t.name} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 max-w-full truncate text-sm font-extrabold text-[var(--ink)]">
                    {t.name}
                  </span>
                  {t.bucket === "other" && (
                    <Badge color="red">Unrecognised</Badge>
                  )}
                  {t.deadRows > 0 && (
                    <Badge color="amber">
                      <Trash2 size={11} />
                      {t.deadRows} dead
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--surface-sunk)] sm:w-40">
                    <div
                      className={cn("h-full rounded-full", BUCKET_FILL[t.bucket])}
                      style={{ width: `${Math.max(1, Math.min(100, t.pctOfDatabase))}%` }}
                    />
                  </div>
                  <span className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                    {Number(t.rows).toLocaleString("en-IN")}
                    {t.rowsAreEstimated ? "≈" : ""} rows · {bytes(t.indexBytes)} indexes
                  </span>
                </div>
              </div>
              <span className="tabular shrink-0 text-sm font-extrabold text-[var(--ink)]">
                {bytes(t.totalBytes)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {(data?.notes ?? []).length > 0 && (
        <Card className="p-5">
          <SectionHeader title="Worth knowing" icon={<HardDrive size={17} />} />
          <ul className="space-y-2">
            {data.notes.map((note: string) => (
              <li
                key={note}
                className="flex gap-2 text-sm font-semibold leading-relaxed text-[var(--ink-muted)]"
              >
                <span aria-hidden="true" className="text-[var(--ink-label)]">
                  —
                </span>
                {note}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs font-semibold text-[var(--ink-label)]">
        {data?.engine === "pglite" ? "Embedded PGlite" : "PostgreSQL"} {data?.serverVersion} ·
        measured {formatWhen(data?.capturedAt)}
        {data?.cached ? " · served from cache" : ""}
      </p>
    </div>
  );
}

function StorageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Measuring database storage…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-4 w-96 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Skeleton className="col-span-2 h-[132px]" />
        <Skeleton className="h-[132px]" />
        <Skeleton className="h-[132px]" />
      </div>
      <Skeleton className="h-32 rounded-[var(--r-card)]" />
      <Skeleton className="h-64 rounded-[var(--r-card)]" />
    </div>
  );
}
