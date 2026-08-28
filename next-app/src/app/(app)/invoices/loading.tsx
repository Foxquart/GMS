import { Skeleton } from "@/components/ui";

/**
 * Invoice book shell: heading, the awaiting-payment tile, search, the
 * status filter row and six rows at the real 78px row height.
 */
export default function InvoicesLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-14 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>

      <Skeleton className="h-[124px] rounded-[var(--r-tile)]" />

      <div className="space-y-3">
        <Skeleton className="h-11 rounded-[var(--r-control)]" />
        <div className="flex gap-2">
          {["w-14", "w-20", "w-24", "w-16", "w-20"].map((w, i) => (
            <Skeleton key={i} className={`h-8 rounded-full ${w}`} />
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[78px]" />
        ))}
      </div>
    </div>
  );
}
