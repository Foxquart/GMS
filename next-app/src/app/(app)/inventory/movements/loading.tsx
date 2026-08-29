import { Skeleton, StickyControls } from "@/components/ui";

/** Shell of the movements page: pinned title and location filter, then rows. */
export default function MovementsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <StickyControls className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="hidden h-3 w-20 rounded-full sm:block" />
            <Skeleton className="h-7 w-48 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-[52px] rounded-full" />
      </StickyControls>

      <Skeleton className="h-4 w-64 rounded-full" />

      <div className="space-y-2">
        <Skeleton className="h-5 w-32 rounded-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px]" />
        ))}
      </div>
    </div>
  );
}
