import { Skeleton } from "@/components/ui";

/** Shell of one category: back row, sub-category chips, then the parts grid. */
export default function CategoryLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-[5.5rem] rounded-[var(--r-panel)]" />
      <Skeleton className="h-11 rounded-[var(--r-control)]" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[11.5rem]" />
        ))}
      </div>
    </div>
  );
}
