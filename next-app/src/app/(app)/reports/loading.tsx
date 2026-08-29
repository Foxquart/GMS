import { Skeleton } from "@/components/ui";

/** Shell of the reports page: heading, the period tabs, then the figures card. */
export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="h-4 w-64 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-[46px] rounded-full" />
        <Skeleton className="h-[19.5rem] rounded-[var(--r-card)]" />
      </div>
    </div>
  );
}
