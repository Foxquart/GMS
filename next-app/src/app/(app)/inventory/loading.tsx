import { BentoGrid, Skeleton } from "@/components/ui";

/** Shell of the inventory hub: bento header, shelf links, switch, parts list. */
export default function InventoryLoading() {
  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-4 w-56 rounded-full" />
        </div>
        <div className="hidden gap-2 md:flex">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>

      <BentoGrid>
        <Skeleton className="col-span-2 h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="col-span-2 h-24" />
      </BentoGrid>

      <div className="flex flex-wrap gap-2">
        {["categories", "suppliers", "movements", "transfers"].map((k) => (
          <Skeleton key={k} className="h-9 w-28 rounded-full" />
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-12 rounded-full" />
        <Skeleton className="h-11 rounded-[var(--r-control)]" />
      </div>

      <div className="space-y-2.5">
        <Skeleton className="h-5 w-28 rounded-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px]" />
        ))}
      </div>
    </div>
  );
}
