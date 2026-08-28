import { Skeleton } from "@/components/ui";

/** Shell of the transfers page: header, move panel, transfer history. */
export default function TransfersLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
      </div>

      <Skeleton className="h-64 rounded-[var(--r-panel)]" />

      <div className="space-y-2">
        <Skeleton className="h-5 w-40 rounded-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px]" />
        ))}
      </div>
    </div>
  );
}
