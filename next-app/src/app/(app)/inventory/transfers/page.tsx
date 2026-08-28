"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftRight, MoveRight, ArrowLeft, Store, Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  CircleButton,
  EmptyState,
  ErrorState,
  Input,
  Panel,
  SectionHeader,
  Select,
  Skeleton,
} from "@/components/ui";
import { SpotTools } from "@/components/illustrations";
import { formatDateTime } from "@/lib/format";

export default function TransfersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");

  const { data: parts, isPending: partsPending } = useQuery({
    queryKey: ["parts"],
    queryFn: () => api<any[]>("/api/parts"),
  });
  const { data: transfers, isPending, isError, error, refetch } = useQuery({
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
      toast.success(`${qty} moved from warehouse to shop`);
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
  const available = Number(selectedPart?.warehouseStock ?? 0);
  const tooMany = Boolean(selectedPart) && Number(qty) > available;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <CircleButton onDark={false} onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={18} />
        </CircleButton>
        <div className="min-w-0">
          <p className="tile-label text-[var(--ink-label)]">Inventory</p>
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-[var(--ink)]">
            Move stock
          </h1>
        </div>
      </div>

      <Panel title="Warehouse to shop floor" icon={<ArrowLeftRight size={17} />}>
        <div className="space-y-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="tile-label text-[var(--ink-on-dark-muted)]">Part</span>
            {partsPending ? (
              <Skeleton className="h-11 rounded-[var(--r-control)]" />
            ) : (
              <Select
                value={partId}
                onChange={(e) => setPartId(e.target.value)}
                aria-label="Part to move"
              >
                <option value="">Pick a part…</option>
                {(parts ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — warehouse {p.warehouseStock}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {selectedPart && (
            <div className="flex items-center justify-between gap-3 rounded-[var(--r-tile)] bg-white/10 px-4 py-3">
              <div>
                <p className="tile-label flex items-center gap-1.5 text-[var(--ink-on-dark-muted)]">
                  <Warehouse size={12} /> Warehouse
                </p>
                <p className="numeral mt-1 text-xl">{available}</p>
              </div>
              <MoveRight size={18} className="shrink-0 text-[var(--ink-on-dark-muted)]" />
              <div className="text-right">
                <p className="tile-label flex items-center justify-end gap-1.5 text-[var(--ink-on-dark-muted)]">
                  <Store size={12} /> Shop floor
                </p>
                <p className="numeral mt-1 text-xl">{Number(selectedPart.shopStock ?? 0)}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="tile-label text-[var(--ink-on-dark-muted)]">Quantity</span>
            <Input
              type="number"
              min={1}
              max={selectedPart?.warehouseStock}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              aria-label="Quantity to move"
              className="tabular"
            />
            {tooMany && (
              <span className="text-xs font-semibold text-[var(--ochre)]">
                Only {available} {selectedPart?.unit || "pcs"} in the warehouse.
              </span>
            )}
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => transfer.mutate()}
            disabled={!partId || transfer.isPending || Number(qty) < 1 || tooMany}
          >
            <MoveRight size={16} />
            {transfer.isPending ? "Moving stock…" : "Move to shop"}
          </Button>
        </div>
      </Panel>

      <section>
        <SectionHeader
          title="Transfer history"
          icon={<ArrowLeftRight size={16} />}
          action={
            transfers ? (
              <span className="tile-label text-[var(--ink-label)]">{transfers.length} moves</span>
            ) : null
          }
        />

        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px]" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            message={(error as Error)?.message ?? "The transfer history didn't load."}
            onRetry={() => refetch()}
          />
        ) : !transfers?.length ? (
          <EmptyState
            illustration={<SpotTools size={84} />}
            title="No transfers yet"
            description="Move a part from the warehouse to the shop floor and it will be recorded here."
          />
        ) : (
          <ul className="space-y-2">
            {transfers.map((t: any) => (
              <li
                key={t.id}
                className="rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {(t.items ?? []).map((it: any) => {
                      const p = (parts ?? []).find((x: any) => x.id === it.partId);
                      return (
                        <p
                          key={it.id}
                          className="truncate text-sm font-extrabold text-[var(--ink)]"
                        >
                          {p?.name ?? "Part"}{" "}
                          <span className="tabular text-[var(--ink-muted)]">× {it.quantity}</span>
                        </p>
                      );
                    })}
                    <p className="truncate text-xs font-semibold text-[var(--ink-label)]">
                      {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Badge color="blue">Warehouse → Shop</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
