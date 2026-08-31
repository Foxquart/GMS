"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Database, RefreshCw, Server } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  BentoGrid,
  Button,
  Card,
  ErrorState,
  Panel,
  SectionHeader,
  Skeleton,
  StatTile,
  Step,
} from "@/components/ui";
import { formatWhen, latencyTone, statusBadgeColor, statusTone } from "../_status";

export default function SuperadminHealthPage() {
  const { data, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ["superadmin-health-detail"],
    queryFn: () => api<any>("/api/superadmin/health"),
    refetchInterval: 5000,
  });

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
          Health checks
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Database and route-handler latency, re-benchmarked every 5 seconds.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => refetch()}
        disabled={isRefetching}
        className="h-11 self-start sm:h-8"
      >
        <RefreshCw size={14} className={isRefetching ? "gear-spin" : undefined} />
        {isRefetching ? "Benchmarking…" : "Run benchmark"}
      </Button>
    </div>
  );

  if (isError && !data) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState
          title="The benchmark didn't complete"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading) return <HealthSkeleton />;

  const dbLatency = Number(data?.database?.latencyMs ?? 0);
  const apiLatency = Number(data?.api?.latencyMs ?? 0);
  const dbStatus = String(data?.database?.status ?? "HEALTHY");
  const apiStatus = String(data?.api?.status ?? "HEALTHY");

  return (
    <div className="space-y-5">
      {header}

      {/* From lg the hero keeps its double width while the other two readings
          take a quarter each, rather than every tile carrying ~560px of fill
          on a wide screen. */}
      <BentoGrid className="lg:grid-cols-4">
        <StatTile
          className="col-span-2 min-h-[132px]"
          tone={statusTone(dbStatus) === "forest" ? latencyTone(dbLatency) : statusTone(dbStatus)}
          label="Database round trip"
          value={dbLatency}
          unit="ms"
          icon={<Database size={18} />}
          footnote={`${dbStatus} · degrades above the 500 ms threshold`}
        />
        <StatTile
          tone="bright"
          label="Route handlers"
          value={apiLatency}
          unit="ms"
          icon={<Server size={16} />}
          footnote={`Server time · ${apiStatus}`}
        />
        <StatTile
          tone="cream"
          label="Alert threshold"
          value={500}
          unit="ms"
          icon={<Activity size={16} />}
          footnote="Above this, an alert opens automatically"
        />
      </BentoGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="PostgreSQL" icon={<Database size={17} />} />
          <dl className="divide-y divide-[var(--hairline)]">
            <DetailRow label="Status">
              <Badge color={statusBadgeColor(dbStatus)} dot>
                {dbStatus.toUpperCase()}
              </Badge>
            </DetailRow>
            <DetailRow label="Round-trip probe">
              <span className="tabular text-sm font-extrabold text-[var(--ink)]">{dbLatency} ms</span>
            </DetailRow>
            <DetailRow label="Threshold">
              <span className="tabular text-sm font-extrabold text-[var(--ink)]">500 ms</span>
            </DetailRow>
            {/* A driver diagnostic can be one unbreakable token — a DSN, a
                socket path — so it needs an explicit break opportunity. */}
            <DetailRow label="Diagnostic">
              <span className="break-words text-sm font-semibold text-[var(--ink-muted)]">
                {data?.database?.details ?? "No diagnostic returned"}
              </span>
            </DetailRow>
          </dl>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Next.js route handlers" icon={<Server size={17} />} />
          <dl className="divide-y divide-[var(--hairline)]">
            <DetailRow label="Status">
              <Badge color={statusBadgeColor(apiStatus)} dot>
                {apiStatus.toUpperCase()}
              </Badge>
            </DetailRow>
            <DetailRow label="Server time (incl. database)">
              <span className="tabular text-sm font-extrabold text-[var(--ink)]">{apiLatency} ms</span>
            </DetailRow>
            <DetailRow label="Last reading">
              <span className="text-sm font-semibold text-[var(--ink-muted)]">
                {formatWhen(data?.timestamp)}
              </span>
            </DetailRow>
            <DetailRow label="Diagnostic">
              <span className="break-words text-sm font-semibold text-[var(--ink-muted)]">
                {data?.api?.details ?? "No diagnostic returned"}
              </span>
            </DetailRow>
          </dl>
        </Card>
      </div>

      <Panel title="What this benchmark does" icon={<Activity size={17} />}>
        <Step n={1}>A count query runs against the users table and is timed end to end.</Step>
        <Step n={2}>Anything slower than 500&nbsp;ms is recorded as degraded and opens an alert.</Step>
        <Step n={3}>Every reading is written to the health-check history, so trends survive a restart.</Step>
      </Panel>
    </div>
  );
}

/**
 * Two-column fact row: label left, figure right, never colliding.
 *
 * The value used to be `shrink-0`, which pins it at max-content — a driver
 * error or connection string in a Diagnostic row then ran straight out of the
 * card. It now shrinks and breaks, and below sm it takes its own line instead
 * of leaving a squashed column beside the label.
 */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="tile-label shrink-0 text-[var(--ink-label)]">{label}</dt>
      <dd className="min-w-0 break-words sm:text-right">{children}</dd>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Benchmarking database and API latency…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-full max-w-44 rounded-full" />
        {/* A fixed w-80 overflows the 288px content column on a 320px phone. */}
        <Skeleton className="h-4 w-full max-w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Skeleton className="col-span-2 h-[132px]" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      {/* The fact rows stack label over value below sm, so the cards run
          taller there than once the row splits into columns. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[19.5rem] rounded-[var(--r-card)] sm:h-60" />
        <Skeleton className="h-[19.5rem] rounded-[var(--r-card)] sm:h-60" />
      </div>
      <Skeleton className="h-44 rounded-[var(--r-panel)]" />
    </div>
  );
}
