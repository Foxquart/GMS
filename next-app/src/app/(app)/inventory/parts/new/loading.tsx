import { Skeleton } from "@/components/ui";

/** Shell of the new-part form: header, three field sections, submit. */
export default function NewPartLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
      </div>

      {[2, 1, 1].map((rows, i) => (
        <div
          key={i}
          className="space-y-3.5 rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4 sm:p-5"
        >
          <Skeleton className="h-5 w-32 rounded-full" />
          {Array.from({ length: rows }).map((_, r) => (
            <Skeleton key={r} className="h-11 rounded-[var(--r-control)]" />
          ))}
        </div>
      ))}

      <Skeleton className="h-12 rounded-full" />
    </div>
  );
}
