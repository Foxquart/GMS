import { Skeleton } from "@/components/ui";

/** Back control + title, then the three blocks of the job form. */
export default function NewJobLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-5" role="status" aria-label="Loading the job form">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-3">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-11 rounded-[var(--r-control)]" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-[5.5rem]" />
          <Skeleton className="h-11 rounded-[var(--r-control)]" />
          <Skeleton className="h-11 rounded-[var(--r-control)]" />
          <Skeleton className="h-11 rounded-[var(--r-control)]" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-[5.5rem] rounded-[var(--r-control)]" />
        </div>

        <Skeleton className="h-12 rounded-full" />
      </div>
    </div>
  );
}
