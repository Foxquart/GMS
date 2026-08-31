"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  StickyControls,
} from "@/components/ui";
import { SpotClipboard } from "@/components/illustrations";
import { formatWhen } from "../_status";

/** Destructive actions read terracotta, creations forest, everything else neutral. */
function actionColor(action?: string): "green" | "amber" | "red" | "slate" {
  const a = (action ?? "").toUpperCase();
  if (a.startsWith("DELETE") || a.includes("FAIL")) return "red";
  if (a.startsWith("DISABLE") || a.includes("WARN")) return "amber";
  if (a.startsWith("CREATE") || a.startsWith("ENABLE")) return "green";
  return "slate";
}

export default function SuperadminActivityPage() {
  const { data: logs, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ["superadmin-activity"],
    queryFn: () => api<any[]>("/api/superadmin/activity"),
  });

  const header = (
    <>
      {/* The console stacks a 64px operator bar over a 56px tab strip, both
          opaque and above this in z-order — `--console-sticky-top` is the
          shell's own measure of that, so the bar pins below them instead of
          sliding out of sight behind them. One line only: what this log is,
          and the button that re-reads it. The sentence counting the entries
          scrolls away with the first few rows. */}
      <StickyControls className="top-[var(--console-sticky-top)] lg:top-[var(--console-sticky-top)]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
            Audit log
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            // Full 44px target on touch; back to the compact bar height on sm+.
            className="h-11 shrink-0 sm:h-8"
          >
            <RefreshCw size={14} className={isRefetching ? "gear-spin" : undefined} />
            {isRefetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </StickyControls>

      <p className="text-sm text-[var(--ink-muted)]">
        {logs?.length
          ? `The last ${logs.length} administrative and platform actions, newest first.`
          : "Administrative and platform actions, newest first."}
      </p>
    </>
  );

  return (
    <div className="space-y-5">
      {header}

      {isError && !logs ? (
        <ErrorState
          title="The audit log didn't load"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <ActivityRowsSkeleton />
      ) : !logs?.length ? (
        <EmptyState
          title="No events recorded yet"
          description="Creating an admin, disabling an account or deleting a record all leave a line here."
          illustration={<SpotClipboard size={84} />}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-[var(--hairline)]">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1.5 px-4 py-3 transition-[background-color] duration-150 ease-out hover:bg-[var(--surface)] sm:flex-row sm:items-start sm:justify-between sm:gap-3"
              >
                {/* Identity left, timestamp right from sm up. On a phone a
                    locale timestamp plus an action name cannot share a line
                    without starving one of them, so the stamp takes its own. */}
                <div className="min-w-0">
                  {/* Action names run long (SUPERADMIN_DELETE_ADMIN); the badge
                      cannot shrink, so it takes its own line rather than
                      squeezing the actor's name to nothing. */}
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge color={actionColor(log.action)}>{log.action}</Badge>
                    <span className="min-w-0 truncate text-xs font-bold text-[var(--ink)]">
                      {log.userName || log.userId || "System"}
                    </span>
                  </div>
                  {log.details && (
                    <p className="mt-1.5 break-words text-xs leading-relaxed text-[var(--ink-muted)]">
                      {log.details}
                    </p>
                  )}
                  {log.resourceType && (
                    <p className="tile-label mt-1 break-words text-[var(--ink-label)]">
                      {log.resourceType}
                      {log.resourceId ? ` · ${String(log.resourceId).slice(0, 8)}` : ""}
                    </p>
                  )}
                </div>
                <span className="tabular shrink-0 text-[11px] font-semibold text-[var(--ink-label)] sm:text-right">
                  {formatWhen(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ActivityRowsSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <span className="sr-only">Loading the audit log…</span>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        // Rows carry the timestamp on its own line below sm, so they are
        // taller there — the skeleton has to grow with them or the list jumps.
        <Skeleton key={i} className="h-[92px] rounded-[var(--r-tile)] sm:h-[74px]" />
      ))}
    </div>
  );
}
