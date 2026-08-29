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
      {/* The operator bar above is 64px tall at every width, so this pins
          under it rather than under the workshop's mobile bar. One line only:
          what this log is, and the button that re-reads it. The sentence
          counting the entries scrolls away with the first few rows. */}
      <StickyControls className="top-16 lg:top-16">
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
            Audit log
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="shrink-0"
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
                className="flex items-start justify-between gap-3 px-4 py-3 transition-[background-color] duration-150 ease-out hover:bg-[var(--surface)]"
              >
                {/* Identity left, timestamp right — the row never reflows. */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge color={actionColor(log.action)}>{log.action}</Badge>
                    <span className="min-w-0 truncate text-xs font-bold text-[var(--ink)]">
                      {log.userName || log.userId || "System"}
                    </span>
                  </div>
                  {log.details && (
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-muted)]">
                      {log.details}
                    </p>
                  )}
                  {log.resourceType && (
                    <p className="tile-label mt-1 text-[var(--ink-label)]">
                      {log.resourceType}
                      {log.resourceId ? ` · ${String(log.resourceId).slice(0, 8)}` : ""}
                    </p>
                  )}
                </div>
                <span className="tabular shrink-0 text-[11px] font-semibold text-[var(--ink-label)]">
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
        <Skeleton key={i} className="h-[74px] rounded-[var(--r-tile)]" />
      ))}
    </div>
  );
}
