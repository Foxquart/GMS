import { BentoGrid, Skeleton, StickyControls } from "@/components/ui";

/**
 * Shell of a part page: hero, action row, balances, spec grid, history.
 *
 * The action row sits in the same `StickyControls` the page uses — with the
 * same gutter-bleed override for this narrower column — so the shell does not
 * jump when the real part paints over it.
 */
export default function PartLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Skeleton className="h-48 rounded-[var(--r-panel)]" />

      <StickyControls className="mx-0 px-0 lg:mx-0 lg:px-0">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-full" />
          ))}
        </div>
      </StickyControls>

      <div className="space-y-3">
        <Skeleton className="h-5 w-40 rounded-full" />
        <BentoGrid>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </BentoGrid>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-28 rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-5 w-36 rounded-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[62px]" />
        ))}
      </div>
    </div>
  );
}
