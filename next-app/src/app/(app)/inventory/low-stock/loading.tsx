import { BentoGrid, Skeleton, StickyControls } from "@/components/ui";

/** Shell of the low-stock page: pinned title bar, strapline, counts, rows. */
export default function LowStockLoading() {
  return (
    <div className="space-y-5">
      <StickyControls>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="hidden h-3 w-20 rounded-full sm:block" />
            <Skeleton className="h-7 w-40 rounded-full" />
          </div>
        </div>
      </StickyControls>

      <Skeleton className="h-4 w-64 rounded-full" />

      <BentoGrid>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </BentoGrid>

      <div className="space-y-2.5">
        <Skeleton className="h-5 w-40 rounded-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.75rem]" />
        ))}
      </div>
    </div>
  );
}
