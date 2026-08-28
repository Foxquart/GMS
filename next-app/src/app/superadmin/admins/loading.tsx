import { Skeleton } from "@/components/ui";

/** Mirrors admins/page.tsx: title block, three count tiles, account rows. */
export default function SuperadminAdminsLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading admin accounts…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-full" />
        <Skeleton className="h-4 w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="col-span-2 h-28 sm:col-span-1" />
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-[var(--r-card)]" />
        ))}
      </div>
    </div>
  );
}
