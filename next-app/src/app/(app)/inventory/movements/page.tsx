"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Badge, EmptyState, Skeleton, Select, ErrorState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

const movementColor = (m: string) =>
  m === "STOCK_IN" || m === "TRANSFER_IN"
    ? "green"
    : m === "JOB_USAGE" || m === "TRANSFER_OUT"
      ? "amber"
      : m === "ADJUSTMENT"
        ? "blue"
        : "slate";

const movementLabel = (m: string) =>
  m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function MovementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partId = searchParams.get("partId") ?? undefined;
  const [locationCode, setLocationCode] = useState("");

  const { data: movements, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["movements", partId, locationCode],
    queryFn: () =>
      api<any[]>("/api/inventory/movements", {
        params: { partId, locationCode: locationCode || undefined },
      }),
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Movements</h1>
          <p className="text-sm text-slate-500">Audit trail for every stock change</p>
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Location</span>
        <Select value={locationCode} onChange={(e) => setLocationCode(e.target.value)}>
          <option value="">All locations</option>
          <option value="SHOP">Shop</option>
          <option value="WAREHOUSE">Warehouse</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : !movements?.length ? (
        <EmptyState title="No movements found" />
      ) : (
        <div className="space-y-2">
          {movements.map((m: any) => (
            <Card key={m.id} className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  <span className={m.quantity > 0 ? "text-emerald-600" : "text-red-600"}>
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </span>{" "}
                  {m.partName}
                </p>
                <p className="text-xs text-slate-500">
                  {movementLabel(m.movementType)} · {m.locationCode} · {formatDateTime(m.createdAt)}
                </p>
                {m.notes && <p className="mt-0.5 text-xs text-slate-400">{m.notes}</p>}
              </div>
              <Badge color={movementColor(m.movementType)}>{m.movementType}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}