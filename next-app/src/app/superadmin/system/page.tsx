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

      <BentoGrid className="sm:grid-cols-4">
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

/** Two-column fact row: label left, value right, both truncating cleanly. */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="tile-label shrink-0 text-[var(--ink-label)]">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-bold text-[var(--ink)]">{children}</dd>
    </div>
  );
}

function SystemSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Reading the runtime environment…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded-full" />
        <Skeleton className="h-4 w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-[var(--r-card)]" />
    </div>
  );
}
