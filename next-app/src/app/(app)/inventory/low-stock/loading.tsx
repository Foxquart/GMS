import { BentoGrid, Skeleton, StickyControls } from "@/components/ui";

/**
 * Shell of the low-stock page: pinned title bar and filters, strapline,
 * counts, rows.
 *
 * The pinned band carries two lines now, not one — the filter chips moved into
 * it so they stay reachable down a long list. Drawing only the title row here
 * meant everything below it shifted down by the height of the chips the moment
 * the data arrived.
 */
export default function LowStockLoading() {
  return (
    <div className="space-y-5">
      <StickyControls className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="hidden h-3 w-20 rounded-full sm:block" />
            <Skeleton className="h-7 w-40 rounded-full" />
          </div>
        </div>
        {/* Four filter chips at the touch height they render at. Widths are
            classes, not inline styles — `Skeleton` takes only `className`, so
            a `style` prop would be dropped without complaint. */}
        <div className="flex flex-wrap gap-1.5">
          {["w-14", "w-24", "w-22", "w-24"].map((w, i) => (
            <Skeleton key={i} className={`h-11 rounded-full ${w}`} />
          ))}
        </div>
      </StickyControls>

      <Skeleton className="h-4 w-64 rounded-full" />

      <BentoGrid>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </BentoGrid>

      {/* The section heading carries a sort control on the right. */}
      <div className="space-y-2.5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.75rem]" />
        ))}
      </div>
    </div>
  );
}
