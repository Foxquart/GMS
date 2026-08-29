import { Skeleton, StickyControls } from "@/components/ui";

/**
 * Shell of the categories page. The pinned bar (back, title, New, search and
 * the archived switch) is drawn with the same primitive the page uses, so the
 * list below starts at the same offset once the real content arrives.
 */
export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <StickyControls className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="min-w-0 space-y-1.5">
              {/* The eyebrow only exists from sm up on the real page. */}
              <Skeleton className="hidden h-3 w-20 rounded-full sm:block" />
              <Skeleton className="h-7 w-36 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-20 rounded-full" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-11 min-w-[11rem] flex-1 rounded-[var(--r-control)]" />
          <Skeleton className="h-11 w-[8.5rem] shrink-0 rounded-full" />
        </div>
      </StickyControls>

      <div className="space-y-2">
        <Skeleton className="h-5 w-40 rounded-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px]" />
        ))}
      </div>
    </div>
  );
}
