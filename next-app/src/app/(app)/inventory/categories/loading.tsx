import { Skeleton } from "@/components/ui";

/** Shell of the categories page: header, search, archived toggle, list. */
export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-7 w-36 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-20 rounded-full" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-11 rounded-[var(--r-control)]" />
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-5 w-40 rounded-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px]" />
        ))}
      </div>
    </div>
  );
}
