"use client";

import { useQuery } from "@tanstack/react-query";
import { Code, Cpu, HardDrive, Server, Terminal } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  BentoGrid,
  Card,
  ErrorState,
  SectionHeader,
  Skeleton,
  SpecTile,
} from "@/components/ui";
import { formatWhen } from "../_status";

export default function SuperadminSystemPage() {
  const { data: sysInfo, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["superadmin-system"],
    queryFn: () => api<any>("/api/superadmin/system"),
  });

  const header = (
    <div className="min-w-0">
      <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
        System info
      </h1>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        What this deployment is actually running — useful when a bug report needs pinning down.
      </p>
    </div>
  );

  if (isError && !sysInfo) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState
          title="Couldn't read the runtime"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading) return <SystemSkeleton />;

  const environment = String(sysInfo?.environment || "production");

  return (
    <div className="space-y-5">
      {header}

      {/* Four across from lg, not sm: between 640 and 860px a quarter column is
          narrow enough that "PGlite (embedded)" wraps to three lines while the
          version tiles beside it sit nearly empty. `break-words` is inherited
          by the value, which is a server-reported version string. */}
      <BentoGrid className="break-words lg:grid-cols-4">
        <SpecTile
          tone="bright"
          icon={<Code size={18} />}
          label="App version"
          value={sysInfo?.appVersion || "1.1.0"}
        />
        <SpecTile
          tone={environment === "production" ? "sage" : "ochre"}
          icon={<Server size={18} />}
          label="Environment"
          value={<span className="capitalize">{environment}</span>}
        />
        <SpecTile
          tone="bright"
          icon={<Cpu size={18} />}
          label="Next.js"
          value={sysInfo?.nextVersion || "16.3.1"}
        />
        <SpecTile
          tone="cream"
          icon={<HardDrive size={18} />}
          label="Database"
          value={sysInfo?.usePglite ? "PGlite (embedded)" : "PostgreSQL"}
        />
      </BentoGrid>

      <Card className="p-5">
        <SectionHeader title="Runtime detail" icon={<Terminal size={17} />} />
        <dl className="divide-y divide-[var(--hairline)]">
          <InfoRow label="Database driver">
            {sysInfo?.usePglite ? "Embedded PGlite (development)" : "Managed PostgreSQL (node-postgres)"}
          </InfoRow>
          <InfoRow label="Node version">{sysInfo?.nodeVersion ?? "Not reported"}</InfoRow>
          <InfoRow label="Report generated">{formatWhen(sysInfo?.timestamp)}</InfoRow>
        </dl>
      </Card>
    </div>
  );
}

/**
 * Two-column fact row: label left, value right.
 *
 * The value used to `truncate`, which defeats the point of the page — these
 * are the exact strings someone quotes into a bug report, and at 320px the
 * label left them barely 130px. They now wrap, and below sm the value takes
 * its own line so it has the full column to do it in.
 */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="tile-label shrink-0 text-[var(--ink-label)]">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-bold text-[var(--ink)] sm:text-right">
        {children}
      </dd>
    </div>
  );
}

function SystemSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Reading the runtime environment…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-full max-w-40 rounded-full" />
        {/* A fixed w-80 overflows the 288px content column on a 320px phone. */}
        <Skeleton className="h-4 w-full max-w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      {/* Taller below sm, where each fact row stacks its value under its label. */}
      <Skeleton className="h-64 rounded-[var(--r-card)] sm:h-48" />
    </div>
  );
}
