import { Skeleton, StickyControls } from "@/components/ui";

/** Shell of the suppliers page: pinned title bar, section heading, rows. */
export default function SuppliersLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <StickyControls>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="hidden h-3 w-20 rounded-full sm:block" />
              <Skeleton className="h-7 w-32 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-20 rounded-full" />
        </div>
      </StickyControls>

      <div className="space-y-2">
        <Skeleton className="h-5 w-44 rounded-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px]" />
        ))}
      </div>
    </div>
  );
}
