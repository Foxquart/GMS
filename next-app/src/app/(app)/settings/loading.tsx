import { Skeleton } from "@/components/ui";

/** Mirrors settings/page.tsx: title block, invoice preview panel, two field cards. */
export default function SettingsLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading your workshop settings…</span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-4 w-72 rounded-full" />
      </div>

      <Skeleton className="h-52 rounded-[var(--r-panel)]" />
      <Skeleton className="h-[340px] rounded-[var(--r-card)]" />
      <Skeleton className="h-[280px] rounded-[var(--r-card)]" />
    </div>
  );
}
