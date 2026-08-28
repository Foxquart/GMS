import { Skeleton } from "@/components/ui";

/** Shell of the suppliers page: header, section heading, supplier rows. */
export default function SuppliersLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-20 rounded-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-5 w-44 rounded-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px]" />
        ))}
      </div>
    </div>
  );
}
