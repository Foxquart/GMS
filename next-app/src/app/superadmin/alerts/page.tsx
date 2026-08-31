"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  BentoGrid,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  StatTile,
  StickyControls,
} from "@/components/ui";
import { SpotStamp } from "@/components/illustrations";
import { formatWhen, statusBadgeColor } from "../_status";

export default function SuperadminAlertsPage() {
  const { data: alerts, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ["superadmin-alerts"],
    queryFn: () => api<any[]>("/api/superadmin/alerts"),
  });

  const rows = alerts ?? [];
  const openCount = rows.filter((a: any) => String(a.status).toUpperCase() === "OPEN").length;

  return (
    <div className="space-y-5">
      {/* Pinned below the console chrome: the page's identity and the refresh
          that re-reads it. `top-16` cleared only the operator bar and left this
          sliding under the opaque tab strip, which is 56px taller and sits a
          z-layer above — `--console-sticky-top` is the shell's own measure of
          both. The explanation and the two count tiles scroll away; on a long
          alert history the rows are the point. */}
      <StickyControls className="top-[var(--console-sticky-top,121px)] lg:top-[var(--console-sticky-top,121px)]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
            Alerts
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-11 shrink-0 sm:h-8"
          >
            <RefreshCw size={14} className={isRefetching ? "gear-spin" : undefined} />
            {isRefetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </StickyControls>

      <p className="text-sm text-[var(--ink-muted)]">
        Raised automatically when a health check crosses its threshold.
      </p>

      {isError && !alerts ? (
        <ErrorState
          title="Couldn't load alerts"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <AlertsSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing is above threshold"
          description="Database latency and connectivity are inside their limits. Alerts open here the moment they aren't."
          illustration={<SpotStamp size={84} />}
        />
      ) : (
        <>
          <BentoGrid>
            <StatTile
              tone={openCount > 0 ? "terracotta" : "sage"}
              label="Open"
              value={openCount}
              icon={<AlertTriangle size={16} />}
              footnote={openCount > 0 ? "Waiting on an operator" : "Nothing outstanding"}
            />
            <StatTile
              tone="cream"
              label="Recorded"
              value={rows.length}
              icon={<ShieldAlert size={16} />}
              footnote="Including alerts already closed"
            />
          </BentoGrid>

          <div className="space-y-2.5">
            {rows.map((alert: any) => {
              const severity = String(alert.severity ?? "WARNING").toUpperCase();
              const critical = severity === "CRITICAL";
              return (
                /* Badges are ~90px that cannot shrink. Held beside the message
                   at 320px they left it ~110px, enough to ravel one sentence
                   over six lines, so below sm they take a row of their own —
                   reversed, so severity still reads before the message. */
                <Card
                  key={alert.id}
                  className="flex flex-col-reverse gap-2.5 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                >
                  <div className="flex min-w-0 gap-3">
                    <span
                      className={
                        critical
                          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-[var(--terracotta)] text-[#fdf6f2]"
                          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-[var(--ochre)] text-[var(--forest-deep)]"
                      }
                    >
                      <ShieldAlert size={18} />
                    </span>
                    <div className="min-w-0">
                      {/* Conditions and thresholds come from the server, so
                          they can carry tokens with no break opportunity in
                          them — a URL, a connection string, a raw metric. */}
                      <p className="break-words text-sm font-extrabold leading-snug text-[var(--ink)]">
                        {alert.condition}
                      </p>
                      <p className="mt-1 break-words text-xs text-[var(--ink-muted)]">
                        Threshold{" "}
                        <span className="tabular font-bold text-[var(--ink)]">{alert.threshold}</span>
                        {" · measured "}
                        <span className="tabular font-bold text-[var(--ink)]">
                          {alert.currentValue}
                        </span>
                      </p>
                      <p className="tile-label mt-1.5 text-[var(--ink-label)]">
                        First seen {formatWhen(alert.firstDetectedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-col sm:items-end">
                    <Badge color={critical ? "red" : "amber"} dot>
                      {severity}
                    </Badge>
                    <Badge color={statusBadgeColor(alert.status)}>
                      {String(alert.status ?? "OPEN").toUpperCase()}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading system alerts…</span>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      {/* Taller below sm, where the real card puts its badges on their own row. */}
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-[var(--r-card)] sm:h-[112px]" />
        ))}
      </div>
    </div>
  );
}
