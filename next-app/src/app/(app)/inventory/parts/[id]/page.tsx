"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowDownToLine, Settings2, ArrowLeftRight, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Select, Textarea, Card, Badge, Skeleton, Sheet, EmptyState, ErrorState } from "@/components/ui";
import { currency, formatDateTime } from "@/lib/format";

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [stockInOpen, setStockInOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const [qty, setQty] = useState("1");
  const [location, setLocation] = useState<"SHOP" | "WAREHOUSE">("WAREHOUSE");
  const [newQty, setNewQty] = useState("0");
  const [note, setNote] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["part", id],
    queryFn: () => api<any>(`/api/parts/${id}`),
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api<any[]>("/api/suppliers"),
  });

  const { data: movements, isLoading: movLoading } = useQuery({
    queryKey: ["movements", id],
    queryFn: () => api<any[]>(`/api/inventory/movements`, { params: { partId: id } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["part", id] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
    qc.invalidateQueries({ queryKey: ["movements", id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const stockIn = useMutation({
    mutationFn: () =>
      api("/api/inventory/stock-in", {
        method: "POST",
        body: JSON.stringify({ partId: id, quantity: Number(qty), locationCode: location, notes: note || undefined }),
      }),
    onSuccess: () => {
      toast.success("Stock added");
      setStockInOpen(false);
      setQty("1");
      setNote("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const adjust = useMutation({
    mutationFn: () =>
      api("/api/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({ partId: id, newQuantity: Number(newQty), locationCode: location, notes: note || undefined }),
      }),
    onSuccess: () => {
      toast.success("Stock adjusted");
      setAdjustOpen(false);
      setNote("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const transfer = useMutation({
    mutationFn: () =>
      api("/api/inventory/transfers", {
        method: "POST",
        body: JSON.stringify({ partId: id, quantity: Number(qty), notes: note || undefined }),
      }),
    onSuccess: () => {
      toast.success("Moved from Warehouse to Shop");
      setTransferOpen(false);
      setQty("1");
      setNote("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data) return <EmptyState title="Part not found" />;

  const part = data;
  const balances = Object.fromEntries((data.balances ?? []).map((b: any) => [b.code, b.quantity]));
  const shopStock = Number(balances.SHOP ?? 0);
  const warehouseStock = Number(balances.WAREHOUSE ?? 0);

  const movementLabel = (m: string) =>
    m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{part.name}</h1>
          <p className="text-sm text-slate-500">{part.partNumber || "No part number"} · {part.brand || "No brand"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{shopStock}</p>
          <p className="text-xs font-medium text-slate-500">Shop</p>
          <p className="text-xs text-slate-400">min {part.minimumShopStock}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{warehouseStock}</p>
          <p className="text-xs font-medium text-slate-500">Warehouse</p>
          <p className="text-xs text-slate-400">min {part.minimumWarehouseStock}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{shopStock + warehouseStock}</p>
          <p className="text-xs font-medium text-slate-500">Total</p>
          <p className="text-xs text-slate-400">{part.unit || "pcs"}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Selling Price</p>
            <p className="font-semibold text-slate-900">{currency(part.sellingPrice)}</p>
          </div>
          <div>
            <p className="text-slate-500">Purchase Price</p>
            <p className="font-semibold text-slate-900">{currency(part.purchasePrice)}</p>
          </div>
        </div>
        {part.description && <p className="mt-3 text-sm text-slate-600">{part.description}</p>}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => setStockInOpen(true)}>
          <ArrowDownToLine size={16} /> Stock In
        </Button>
        <Button variant="outline" onClick={() => { setLocation("SHOP"); setAdjustOpen(true); }}>
          <Settings2 size={16} /> Adjust
        </Button>
        <Button variant="outline" onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight size={16} /> Move to Shop
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Movement History</h2>
          <Link href={`/inventory/movements?partId=${id}`} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
            <Search size={14} /> All
          </Link>
        </div>
        {movLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : !movements?.length ? (
          <EmptyState title="No movements yet" />
        ) : (
          <div className="space-y-2">
            {movements.slice(0, 8).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity} {part.unit}
                  </p>
                  <p className="text-xs text-slate-500">
                    {movementLabel(m.movementType)} · {m.locationCode} · {formatDateTime(m.createdAt)}
                  </p>
                </div>
                <Badge color={m.quantity > 0 ? "green" : "slate"}>{m.movementType}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock in sheet */}
      <Sheet open={stockInOpen} onClose={() => setStockInOpen(false)} title="Stock In">
        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Location</span>
            <Select value={location} onChange={(e) => setLocation(e.target.value as any)}>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="SHOP">Shop</option>
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Quantity</span>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Supplier (optional)</span>
            <Select defaultValue="">
              <option value="">No supplier</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</span>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <Button className="w-full" onClick={() => stockIn.mutate()} disabled={stockIn.isPending}>
            Add Stock
          </Button>
        </div>
      </Sheet>

      {/* Adjust sheet */}
      <Sheet open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust Stock">
        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Location</span>
            <Select value={location} onChange={(e) => setLocation(e.target.value as any)}>
              <option value="SHOP">Shop</option>
              <option value="WAREHOUSE">Warehouse</option>
            </Select>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">New Quantity</span>
            <Input type="number" min={0} value={newQty} onChange={(e) => setNewQty(e.target.value)} />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Reason (optional)</span>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <Button className="w-full" onClick={() => adjust.mutate()} disabled={adjust.isPending}>
            Save Adjustment
          </Button>
        </div>
      </Sheet>

      {/* Transfer sheet */}
      <Sheet open={transferOpen} onClose={() => setTransferOpen(false)} title="Move to Shop">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Warehouse has <strong>{warehouseStock}</strong> {part.unit}. Move to Shop.
          </p>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Quantity</span>
            <Input
              type="number"
              min={1}
              max={warehouseStock}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={() => transfer.mutate()} disabled={transfer.isPending || warehouseStock < 1}>
            Move to Shop
          </Button>
        </div>
      </Sheet>
    </div>
  );
}