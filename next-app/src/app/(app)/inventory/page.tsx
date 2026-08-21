"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package, Search, ArrowDownUp, Plus, ArrowLeftRight, Store, Warehouse } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Badge, Input, Skeleton, EmptyState, ErrorState, Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export default function InventoryPage() {
  const [tab, setTab] = useState<"SHOP" | "WAREHOUSE">("SHOP");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const { data: parts, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["inventory", search],
    queryFn: () => api<any[]>(`/api/parts`, { params: { q: search || undefined } }),
  });

  const stockFor = (p: any) => (tab === "SHOP" ? Number(p.shopStock ?? 0) : Number(p.warehouseStock ?? 0));
  const minFor = (p: any) => (tab === "SHOP" ? Number(p.minimumShopStock ?? 0) : Number(p.minimumWarehouseStock ?? 0));

  const totalPartsCount = parts?.length ?? 0;
  const lowStockCount = parts?.filter((p: any) => stockFor(p) < minFor(p) && stockFor(p) > 0).length ?? 0;
  const outOfStockCount = parts?.filter((p: any) => stockFor(p) === 0).length ?? 0;

  return (
    <div className="space-y-5 pb-16 md:pb-0">
      <div className="flex items-center justify-between border-b border-[#e2e8f0]/50 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Stock Inventory</h1>
          <p className="text-xs font-semibold text-[#64748b]">
            Manage shop and house parts {parts && `· ${totalPartsCount} parts (${lowStockCount} low, ${outOfStockCount} out)`}
          </p>
        </div>
        <div className="hidden gap-2.5 md:flex">
          <Link href="/inventory/transfers">
            <Button variant="outline" className="font-bold">
              <ArrowLeftRight size={16} /> Transfer
            </Button>
          </Link>
          <Link href="/inventory/parts/new">
            <Button className="font-bold">
              <Plus size={16} /> New Part
            </Button>
          </Link>
        </div>
      </div>

      {/* Location switch with sliding active pill transition */}
      <div className="relative flex rounded-2xl bg-white p-1 border border-[#e2e8f0]/80 shadow-sm overflow-hidden select-none">
        {/* Animated sliding background pill */}
        <div
          className={cn(
            "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-[#5865f2] shadow-md shadow-[#5865f2]/25 transition-transform duration-300 ease-out",
            tab === "SHOP" ? "left-1 translate-x-0" : "left-1 translate-x-full"
          )}
        />
        <button
          type="button"
          onClick={() => setTab("SHOP")}
          className={cn(
            "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 cursor-pointer",
            tab === "SHOP" ? "text-white" : "text-[#64748b] hover:text-[#0f172a]"
          )}
        >
          <Store size={16} />
          <span>Shop Stock</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("WAREHOUSE")}
          className={cn(
            "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold uppercase tracking-wider transition-colors duration-200 cursor-pointer",
            tab === "WAREHOUSE" ? "text-white" : "text-[#64748b] hover:text-[#0f172a]"
          )}
        >
          <Warehouse size={16} />
          <span>Warehouse Stock</span>
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-[#94a3b8]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
          placeholder="Search parts by name, number, brand…"
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : !parts?.length ? (
        <EmptyState
          title="No parts found"
          description="Add a part to get started."
          icon={<Package size={36} className="text-[#94a3b8]" />}
          action={
            <Link href="/inventory/parts/new">
              <Button className="font-bold">
                <Plus size={16} /> New Part
              </Button>
            </Link>
          }
        />
      ) : (
        <div key={tab} className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
          {parts.map((p) => {
            const stock = stockFor(p);
            const min = minFor(p);
            return (
              <Link key={p.id} href={`/inventory/parts/${p.id}`}>
                <Card className="flex items-center justify-between p-4 transition-all duration-200 hover:bg-[#f1f5f9]/90 hover:border-[#5865f2]/50 hover:-translate-y-0.5 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5865f2]/15 text-[#5865f2] border border-[#5865f2]/30">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0f172a]">{p.name}</p>
                      <p className="text-xs text-[#64748b] mt-0.5">
                        {p.partNumber || "No part no."} · {p.brand || "No brand"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div key={`${p.id}-${tab}-stock`} className="text-right animate-in fade-in zoom-in-95 duration-200">
                      <p className="text-lg font-black text-[#0f172a]">{stock}</p>
                      <p className="text-[11px] text-[#64748b] font-semibold">{p.unit || "pcs"}</p>
                    </div>
                    <div key={`${p.id}-${tab}-badge`} className="animate-in fade-in zoom-in-95 duration-200">
                      {stock < min ? (
                        <Badge color="red" dot>LOW</Badge>
                      ) : stock === 0 ? (
                        <Badge color="gray" dot>OUT</Badge>
                      ) : (
                        <Badge color="green" dot>OK</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center gap-2 px-4 md:hidden">
        <Link href="/inventory/transfers" className="flex-1">
          <Button variant="outline" className="w-full py-3 font-bold">
            <ArrowDownUp size={16} /> Transfer
          </Button>
        </Link>
        <Link href="/inventory/parts/new" className="flex-1">
          <Button className="w-full py-3 font-bold">
            <Plus size={16} /> New Part
          </Button>
        </Link>
      </div>
    </div>
  );
}