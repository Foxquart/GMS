"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Package,
  Search,
  Plus,
  ArrowLeftRight,
  Store,
  Warehouse,
  X,
  Layers,
  Truck,
  History,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Badge,
  BentoGrid,
  Button,
  EmptyState,
  ErrorState,
  Input,
  SectionHeader,
  Skeleton,
  StatTile,
  Tile,
} from "@/components/ui";
import { SpotOilCan, SpotTools } from "@/components/illustrations";
import { currency } from "@/lib/format";
import { cn } from "@/lib/cn";

type Part = {
  id: string;
  name: string;
  partNumber: string | null;
  brand: string | null;
  categoryName: string | null;
  sellingPrice: string | null;
  unit: string | null;
  minimumShopStock: number;
  minimumWarehouseStock: number;
  shopStock: number;
  warehouseStock: number;
};

type Location = "SHOP" | "WAREHOUSE";

const LOCATIONS: { value: Location; label: string; icon: typeof Store }[] = [
  { value: "SHOP", label: "Shop stock", icon: Store },
  { value: "WAREHOUSE", label: "Warehouse stock", icon: Warehouse },
];

/** Health of one location's balance, in the colour language of the system. */
function health(stock: number, min: number) {
  if (stock <= 0) return "out" as const;
  if (stock < min) return "low" as const;
  return "ok" as const;
}

const healthColor = (h: ReturnType<typeof health>) =>
  h === "out" ? "red" : h === "low" ? "amber" : "blue";

const SHELF_LINKS = [
  { href: "/inventory/categories", label: "Categories", icon: Layers },
  { href: "/inventory/suppliers", label: "Suppliers", icon: Truck },
  { href: "/inventory/movements", label: "Movements", icon: History },
  { href: "/inventory/transfers", label: "Transfers", icon: ArrowLeftRight },
];

export default function InventoryPage() {
  // useSearchParams() must sit inside a Suspense boundary (App Router).
  return (
    <Suspense fallback={<div className="space-y-5"><Skeleton className="h-32 rounded-[var(--r-card)]" /></div>}>
      <InventoryBrowser />
    </Suspense>
  );
}

function InventoryBrowser() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = searchParams.get("categoryId") ?? "";

  const [tab, setTab] = useState<Location>("SHOP");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const { data: parts, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["inventory", search, categoryId],
    queryFn: () =>
      api<Part[]>("/api/parts", {
        params: { q: search || undefined, categoryId: categoryId || undefined },
      }),
    placeholderData: keepPreviousData,
  });

  const categoryName = (parts ?? []).find((p: any) => p.categoryId === categoryId)?.categoryName;

  const stockFor = (p: Part) => Number((tab === "SHOP" ? p.shopStock : p.warehouseStock) ?? 0);
  const minFor = (p: Part) =>
    Number((tab === "SHOP" ? p.minimumShopStock : p.minimumWarehouseStock) ?? 0);

  const rows = parts ?? [];
  const totalParts = rows.length;
  const lowCount = rows.filter((p) => health(stockFor(p), minFor(p)) === "low").length;
  const outCount = rows.filter((p) => health(stockFor(p), minFor(p)) === "out").length;
  const shopUnits = rows.reduce((sum, p) => sum + Number(p.shopStock ?? 0), 0);
  const warehouseUnits = rows.reduce((sum, p) => sum + Number(p.warehouseStock ?? 0), 0);
  const here = tab === "SHOP" ? "shop" : "warehouse";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-muted)]">
            Everything on the shelves, shop and warehouse.
          </p>
        </div>
        {/* Actions live in the header at every width. A second floating bar
            stacked under the nav pill covered the list it sat on top of. */}
        <div className="hidden shrink-0 gap-2 sm:flex">
          <Link href="/inventory/transfers">
            <Button variant="outline">
              <ArrowLeftRight size={16} /> Transfer
            </Button>
          </Link>
          <Link href="/inventory/parts/new">
            <Button>
              <Plus size={16} /> New part
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 sm:hidden">
        <Link href="/inventory/transfers" className="flex-1">
          <Button variant="outline" className="w-full">
            <ArrowLeftRight size={16} /> Transfer
          </Button>
        </Link>
        <Link href="/inventory/parts/new" className="flex-1">
          <Button className="w-full">
            <Plus size={16} /> New part
          </Button>
        </Link>
      </div>

      {categoryId && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sage)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--forest)]">
            <Layers size={13} />
            {categoryName ?? "Category"}
          </span>
          <button
            onClick={() => router.push("/inventory")}
            className="text-xs font-bold text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)]"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* ── Stock position ─────────────────────────────────────────── */}
      {isPending ? (
        <BentoGrid>
          <Skeleton className="col-span-2 h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="col-span-2 h-24" />
        </BentoGrid>
      ) : isError ? null : (
        <BentoGrid>
          <StatTile
            className="col-span-2"
            tone="forest"
            label="Parts on file"
            value={totalParts}
            footnote={
              search ? `Matching “${search}”` : "Tracked across the shop floor and the warehouse"
            }
            icon={<Package size={20} />}
          />
          <StatTile
            tone={lowCount ? "ochre" : "cream"}
            label={`Low in ${here}`}
            value={lowCount}
            footnote={lowCount ? "Below the minimum level" : "Everything above its minimum"}
          />
          <StatTile
            tone={outCount ? "terracotta" : "cream"}
            label={`Out in ${here}`}
            value={outCount}
            footnote={outCount ? "Nothing left on the shelf" : "Nothing has run out"}
          />
          <Tile tone="bright" className="col-span-2 flex items-stretch gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[var(--ink-label)]">
                <Store size={13} />
                <span className="tile-label">Units in shop</span>
              </div>
              <p className="numeral mt-1.5 text-2xl text-[var(--ink)]">{shopUnits}</p>
            </div>
            <div aria-hidden className="w-px shrink-0 bg-[var(--hairline)]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[var(--ink-label)]">
                <Warehouse size={13} />
                <span className="tile-label">Units in warehouse</span>
              </div>
              <p className="numeral mt-1.5 text-2xl text-[var(--ink)]">{warehouseUnits}</p>
            </div>
          </Tile>
        </BentoGrid>
      )}

      {/* ── Shelf links ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {SHELF_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-3.5 py-2",
              "text-xs font-bold text-[var(--ink-muted)]",
              "transition-[background-color,color,border-color] duration-150 ease-out",
              "hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
            )}
          >
            <link.icon size={14} />
            {link.label}
          </Link>
        ))}
      </div>

      {/* ── Location switch + search ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="relative isolate flex select-none rounded-full bg-[var(--surface-sunk)] p-1">
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-1 left-1 z-0 w-[calc(50%-0.25rem)] rounded-full bg-[var(--forest)]",
              "transition-transform duration-200 ease-out",
              tab === "WAREHOUSE" && "translate-x-full",
            )}
          />
          {LOCATIONS.map((loc) => {
            const active = tab === loc.value;
            return (
              <button
                key={loc.value}
                type="button"
                onClick={() => setTab(loc.value)}
                aria-pressed={active}
                className={cn(
                  "relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full py-2.5",
                  "text-[11px] font-extrabold uppercase tracking-[0.1em]",
                  "transition-[color] duration-150 ease-out",
                  active
                    ? "text-[var(--ink-on-dark)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                )}
              >
                <loc.icon size={15} />
                <span>{loc.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
            onBlur={() => setSearch(q)}
            placeholder="Search by name, part number or brand"
            aria-label="Search parts"
            className="pl-11 pr-11"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSearch("");
              }}
              aria-label="Clear search"
              className={cn(
                "absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full",
                "text-[var(--ink-label)] transition-[background-color,color] duration-150 ease-out",
                "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
              )}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Parts list ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title={search ? `Results for “${search}”` : "All parts"}
          action={
            <span className="tile-label text-[var(--ink-label)]">
              {isFetching && !isPending ? "Updating…" : `${totalParts} listed`}
            </span>
          }
        />

        {isPending ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px]" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            message={(error as Error)?.message ?? "The parts list didn't load."}
            onRetry={() => refetch()}
          />
        ) : !rows.length ? (
          <EmptyState
            illustration={search ? <SpotTools size={84} /> : <SpotOilCan size={84} />}
            title={search ? "No parts match that search" : "The shelves are empty"}
            description={
              search
                ? "Try a shorter search — part numbers and brands are matched too."
                : "Add your first part and its shop and warehouse levels will be tracked from here."
            }
            action={
              search ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setSearch("");
                  }}
                >
                  Clear search
                </Button>
              ) : (
                <Link href="/inventory/parts/new">
                  <Button>
                    <Plus size={16} /> New part
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <ul className={cn("space-y-2.5", isFetching && !isPending && "opacity-70")}>
            {rows.map((p) => {
              const shop = Number(p.shopStock ?? 0);
              const warehouse = Number(p.warehouseStock ?? 0);
              const shopHealth = health(shop, Number(p.minimumShopStock ?? 0));
              const whHealth = health(warehouse, Number(p.minimumWarehouseStock ?? 0));
              const activeHealth = tab === "SHOP" ? shopHealth : whHealth;

              return (
                <li key={p.id}>
                  <Link
                    href={`/inventory/parts/${p.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5",
                      "transition-[background-color,border-color,transform] duration-150 ease-out",
                      "hover:border-[var(--hairline-strong)] hover:bg-[var(--surface)] active:scale-[0.995]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-control)]",
                        activeHealth === "out" && "bg-[var(--terracotta)] text-[#fdf6f2]",
                        activeHealth === "low" && "bg-[var(--ochre)] text-[var(--forest-deep)]",
                        activeHealth === "ok" && "bg-[var(--sage)] text-[var(--forest)]",
                      )}
                    >
                      <Package size={19} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[var(--ink)]">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                        {p.partNumber || "No part number"} · {p.brand || "No brand"}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {/* The active location is coloured by its health; the
                          other stays quiet so the toggle actually means
                          something. Both are shrink-0 and never wrap. */}
                      <div className="flex items-center gap-1.5">
                        <Badge color={tab === "SHOP" ? healthColor(shopHealth) : "gray"}>
                          Shop {shop}
                        </Badge>
                        <Badge color={tab === "WAREHOUSE" ? healthColor(whHealth) : "gray"}>
                          W/h {warehouse}
                        </Badge>
                      </div>
                      <span className="tabular text-xs font-bold text-[var(--ink-muted)]">
                        {currency(p.sellingPrice)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

    </div>
  );
}
