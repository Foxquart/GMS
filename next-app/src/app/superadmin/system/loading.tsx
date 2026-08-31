import { Skeleton } from "@/components/ui";

/** Mirrors system/page.tsx: title block, four spec tiles, a runtime card. */
export default function SuperadminSystemLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Reading the runtime environment…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-full max-w-40 rounded-full" />
        {/* A fixed w-80 overflows the 288px content column on a 320px phone. */}
        <Skeleton className="h-4 w-full max-w-80 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      {/* Taller below sm, where each fact row stacks its value under its label. */}
      <Skeleton className="h-64 rounded-[var(--r-card)] sm:h-48" />
    </div>
  );
}
