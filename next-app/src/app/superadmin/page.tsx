"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Database,
  FileText,
  RefreshCw,
  Server,
  Users,
} from "lucide-react";
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
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatTime, latencyTone, statusBadgeColor, statusTone } from "./_status";

export default function SuperadminOverviewPage() {
  const { data, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ["superadmin-health"],
    queryFn: () => api<any>("/api/superadmin/health"),
    refetchInterval: 10000,
  });

  if (isError && !data) {
    return (
      <div className="space-y-5">
        <OverviewHeader lastCheckAt={null} isRefetching={false} onRefresh={() => refetch()} />
        <ErrorState
          title="Health checks didn't come back"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Only the first load is blank — polling refetches keep the last reading
  // on screen so the console never flickers between numbers.
  if (isLoading) return <OverviewSkeleton />;

  const overview = data?.overview ?? {};
  const dbLatency = Number(data?.database?.latencyMs ?? overview.dbLatencyMs ?? 0);
  const apiLatency = Number(data?.api?.latencyMs ?? 0);
  const openAlerts = Number(overview.openAlertsCount ?? 0);
  const recentAudit: any[] = overview.recentAudit ?? [];

  return (
    <div className="space-y-5">
      <OverviewHeader
        lastCheckAt={overview.lastCheckAt ?? data?.timestamp ?? null}
        isRefetching={isRefetching}
        onRefresh={() => refetch()}
      />

      <BentoGrid>
        <StatTile
          className="col-span-2 min-h-[132px]"
          tone={statusTone(overview.systemStatus)}
          label="System status"
          value={overview.systemStatus || "HEALTHY"}
          icon={<Activity size={18} />}
          footnote={
            statusTone(overview.systemStatus) === "forest"
              ? "Database and API handlers are both responding."
              : "One or more components are outside their threshold."
          }
        />

        <StatTile
          tone={latencyTone(dbLatency)}
          label="Database"
          value={dbLatency}
          unit="ms"
          icon={<Database size={16} />}
          footnote={`Threshold 500 ms · ${String(data?.database?.status ?? overview.dbStatus ?? "HEALTHY")}`}
        />
        <StatTile
          tone="bright"
          label="API handlers"
          value={apiLatency}
          unit="ms"
          icon={<Server size={16} />}
          footnote={`Server time · ${String(data?.api?.status ?? "HEALTHY")}`}
        />

        <StatTile
          tone="ochre"
          label="Garage admins"
          value={Number(overview.activeAdmins ?? 0)}
          icon={<Users size={16} />}
          footnote="Operator accounts on this deployment"
        />
        <StatTile
          tone={openAlerts > 0 ? "terracotta" : "cream"}
          label="Open alerts"
          value={openAlerts}
          icon={<AlertTriangle size={16} />}
          footnote={openAlerts > 0 ? "Needs an operator to look" : "Nothing above threshold"}
        />
      </BentoGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Component checks" icon={<Activity size={17} />} />
          <div className="space-y-2.5">
            <CheckRow
              icon={<Database size={16} />}
              name="PostgreSQL database"
              detail={data?.database?.details ?? "No diagnostic returned"}
              status={data?.database?.status}
              latencyMs={dbLatency}
            />
            <CheckRow
              icon={<Server size={16} />}
              name="Next.js route handlers"
              detail={data?.api?.details ?? "No diagnostic returned"}
              status={data?.api?.status}
              latencyMs={apiLatency}
            />
          </div>
        </Card>

        <Panel
          title="Recent activity"
          icon={<FileText size={17} />}
          action={
            recentAudit.length > 0 ? (
              <Link
                href="/superadmin/activity"
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold",
                  "text-[var(--ink-on-dark-muted)] transition-[background-color,color] duration-150 ease-out",
                  "hover:bg-[var(--forest-deep)] hover:text-[var(--ink-on-dark)]",
                )}
              >
                See all <ArrowRight size={13} />
              </Link>
            ) : undefined
          }
        >
          {recentAudit.length === 0 ? (
            <p className="rounded-[var(--r-tile)] bg-[var(--forest-deep)] p-4 text-center text-xs font-semibold text-[var(--ink-on-dark-muted)]">
              No audit events recorded yet. Admin actions will stream in here.
            </p>
          ) : (
            /* This was a `max-h-72 overflow-y-auto` well: an inner scroll
               container that swallows a touch drag and leaves you unable to
               scroll the page from inside it. The feed is six rows and the
               full log has its own page, so the panel just ends. */
            <div className="space-y-1.5">
              {recentAudit.slice(0, 6).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 rounded-[var(--r-tile)] bg-[var(--forest-deep)] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-[var(--ink-on-dark)]">
                      {log.action}
                    </p>
                    <p className="truncate text-[11px] text-[var(--ink-on-dark-muted)]">
                      {log.details || log.userName || "System action"}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-[11px] font-semibold text-[var(--ink-on-dark-muted)]">
                    {formatTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function OverviewHeader({
  lastCheckAt,
  isRefetching,
  onRefresh,
}: {
  lastCheckAt: string | null;
  isRefetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
          System overview
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Infrastructure, database and admin activity — polled every 10 seconds.
          {lastCheckAt ? ` Last reading ${formatTime(lastCheckAt)}.` : ""}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefetching} className="self-start">
        <RefreshCw size={14} className={isRefetching ? "gear-spin" : undefined} />
        {isRefetching ? "Checking…" : "Run checks now"}
      </Button>
    </div>
  );
}

function CheckRow({
  icon,
  name,
  detail,
  status,
  latencyMs,
}: {
  icon: React.ReactNode;
  name: string;
  detail: string;
  status?: string;
  latencyMs: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--r-tile)] bg-[var(--surface-sunk)] p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 text-[var(--ink-label)]">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold text-[var(--ink)]">{name}</p>
          <p className="truncate text-[11px] text-[var(--ink-muted)]">{detail}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="tabular text-xs font-extrabold text-[var(--ink)]">{latencyMs} ms</span>
        <Badge color={statusBadgeColor(status)} dot>
          {(status ?? "HEALTHY").toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Running system health checks…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-52 rounded-full" />
        <Skeleton className="h-4 w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="col-span-2 h-[132px]" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      {/* The activity panel no longer scrolls inside itself, so it is the
          taller of the pair and the row stretches the checks card to match
          it — the shell has to say the same thing or the card grows on paint. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-[var(--r-card)] lg:h-[26rem]" />
        <Skeleton className="h-[26rem] rounded-[var(--r-panel)]" />
      </div>
    </div>
  );
}
