"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftRight, MoveRight, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Input, Select, Card, EmptyState, Skeleton, Badge, ErrorState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export default function TransfersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");

  const { data: parts } = useQuery({
    queryKey: ["parts"],
    queryFn: () => api<any[]>("/api/parts"),
  });
  const { data: transfers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => api<any[]>("/api/inventory/transfers"),
  });

  const transfer = useMutation({
    mutationFn: () =>
      api("/api/inventory/transfers", {
        method: "POST",
        body: JSON.stringify({ partId, quantity: Number(qty) }),
      }),
    onSuccess: () => {
      toast.success("Stock moved from Warehouse to Shop");
      setPartId("");
      setQty("1");
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedPart = (parts ?? []).find((p: any) => p.id === partId);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Move Stock</h1>
          <p className="text-sm text-slate-500">Warehouse → Shop</p>
        </div>
      </div>

      <Card className="space-y-3 p-4">
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Part</span>
          <Select value={partId} onChange={(e) => setPartId(e.target.value)}>
            <option value="">Select part…</option>
            {(parts ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} (Warehouse: {p.warehouseStock})
              </option>
            ))}
          </Select>
        </div>
        {selectedPart && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-600">
              Warehouse <strong>{selectedPart.warehouseStock}</strong>
            </span>
            <MoveRight size={16} className="text-slate-400" />
            <span className="text-slate-600">
              Shop <strong>{selectedPart.shopStock}</strong>
            </span>
          </div>
        )}
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Quantity</span>
          <Input
            type="number"
            min={1}
            max={selectedPart?.warehouseStock}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <Button
          className="w-full"
          onClick={() => transfer.mutate()}
          disabled={!partId || transfer.isPending || Number(qty) < 1}
        >
          <MoveRight size={16} /> Move to Shop
        </Button>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
          <ArrowLeftRight size={16} /> Transfer History
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : !transfers?.length ? (
          <EmptyState title="No transfers yet" />
        ) : (
          <div className="space-y-2">
            {transfers.map((t: any) => (
              <Card key={t.id} className="p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    {(t.items ?? []).map((it: any) => {
                      const p = (parts ?? []).find((x: any) => x.id === it.partId);
                      return (
                        <p key={it.id} className="font-medium text-slate-900">
                          {p?.name ?? "Part"} × {it.quantity}
                        </p>
                      );
                    })}
                  </div>
                  <Badge color="blue">Warehouse → Shop</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(t.createdAt)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}