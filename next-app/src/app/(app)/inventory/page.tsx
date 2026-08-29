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
} from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import { AnimatedDropdown } from "@/components/animated-dropdown";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  SectionHeader,
  Skeleton,
  StickyControls,
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

/** `label` is the full spoken name — the control itself shows only the icon. */
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

/**
 * The stock position used to be four bento tiles above the list. Read-only
 * numbers that tall push the parts list — the reason anyone opens this page —
 * below the fold, so the same figures now ride on the controls instead, where
 * they are also actionable.
 */
// A three-way segmented control could not hold these labels plus their counts
// on one row — they clipped to "A.. / L... / O...". A dropdown shows the full
// name of every option and takes one line whatever the wording.
const STATUS_FILTERS = [
  { value: "ALL", label: "All parts" },
  { value: "LOW", label: "Low stock" },
  { value: "OUT", label: "Out of stock" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

export default function InventoryPage() {
  // useSearchParams() must sit inside a Suspense boundary (App Router).
  return (
    <Suspense
      fallback={
        // Same shape as loading.tsx, so the two never disagree on the layout.
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-4 w-64 rounded-full" />
            </div>
            <div className="flex shrink-0 gap-2">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          </div>
          <StickyControls className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-[52px] w-[118px] rounded-full" />
              <Skeleton className="h-[52px] flex-1 basis-[188px] rounded-full" />
            </div>
            <Skeleton className="h-11 rounded-[var(--r-control)]" />
          </StickyControls>
          <div className="space-y-2.5">
            <Skeleton className="h-5 w-28 rounded-full" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px]" />
            ))}
          </div>
        </div>
      }
    >
      <InventoryBrowser />
    </Suspense>
  );
}

function InventoryBrowser() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = searchParams.get("categoryId") ?? "";

  const [tab, setTab] = useState<Location>("SHOP");
  const [status, setStatus] = useState<StatusFilter>("ALL");
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
  const unitsIn = (loc: Location) =>
    rows.reduce((sum, p) => sum + Number((loc === "SHOP" ? p.shopStock : p.warehouseStock) ?? 0), 0);
  const here = tab === "SHOP" ? "shop" : "warehouse";

  const statusCount = (value: StatusFilter) =>
    value === "ALL" ? totalParts : value === "LOW" ? lowCount : outCount;

  // Filtering happens on the list already in hand — switching Low/Out must not
  // cost a round trip.
  const visible = rows.filter((p) => {
    if (status === "ALL") return true;
    const h = health(stockFor(p), minFor(p));
    return status === "LOW" ? h === "low" : h === "out";
  });

  return (
    <div className="space-y-5">
      {/* The heading and the two actions scroll away. Measured on a 360×640
          phone: pinning this row as well put 243px of chrome above a 310px
          list — the list has to win that argument, so only the controls that
          change what it shows stay put. */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-muted)]">
            Everything on the shelves, shop and warehouse.
          </p>
        </div>

        {/* Icon-only in the title row so the actions cost no vertical space.
            Labelled for screen readers and tooltipped for sighted users, per
            the rule against unlabelled icon-only controls. */}
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/inventory/transfers" aria-label="Transfer stock" title="Transfer stock">
            <Button variant="outline" size="icon" className="h-11 w-11">
              <ArrowLeftRight size={18} />
            </Button>
          </Link>
          <Link href="/inventory/parts/new" aria-label="New part" title="New part">
            <Button size="icon" className="h-11 w-11">
              <Plus size={20} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Pinned: the category the list is narrowed to, where the stock sits,
          what condition it is in, and the search. 130px of controls — the
          list keeps the rest of the screen. */}
      <StickyControls className="space-y-2.5">
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

        {/* Two different axes — where the stock sits, and what condition it is
            in — so they stay two tracks with a gap between them and never read
            as one five-option control. Under ~314px of row they wrap back to
            two lines rather than squashing below a 44px target. */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Where. Icon and count only at this size; the words are carried by
              the accessible name and the tooltip. */}
          <div className="relative isolate flex shrink-0 select-none rounded-full bg-[var(--surface-sunk)] p-1">
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
              const units = unitsIn(loc.value);
              return (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => setTab(loc.value)}
                  aria-pressed={active}
                  aria-label={`${loc.label}, ${units} units`}
                  title={`${loc.label} — ${units} units`}
                  className={cn(
                    "relative z-10 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-2.5",
                    "transition-[color] duration-150 ease-out",
                    active
                      ? "text-[var(--ink-on-dark)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                  )}
                >
                  <loc.icon size={14} aria-hidden />
                  <span aria-hidden className="numeral ml-1.5 text-xs leading-none">
                    {units}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Condition. A dropdown rather than a third segmented control:
              the full label is always readable and the row stays one line. */}
          <AnimatedDropdown
            className="min-w-0 flex-1"
            options={STATUS_FILTERS.map((f) => {
              const count = statusCount(f.value);
              return { id: f.value, name: `${f.label} (${count})` };
            })}
            value={status}
            onChange={(v: string) => setStatus((v || "ALL") as StatusFilter)}
            placeholder="All parts"
          />
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
            placeholder="Search by name, part number"
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
      </StickyControls>

      {/* ── Parts list ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title={
            search
              ? `Results for “${search}”`
              : status === "LOW"
                ? `Low in the ${here}`
                : status === "OUT"
                  ? `Out in the ${here}`
                  : "All parts"
          }
          action={
            <span className="tile-label text-[var(--ink-label)]">
              {isFetching && !isPending ? "Updating…" : `${visible.length} listed`}
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
            title="Couldn't load your parts"
            message={errorMessage(error)}
            reference={errorReference(error)}
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
        ) : !visible.length ? (
          <EmptyState
            illustration={<SpotTools size={84} />}
            title={status === "LOW" ? `Nothing is low in the ${here}` : `Nothing is out in the ${here}`}
            description={
              status === "LOW"
                ? "Every part is at or above its minimum level for this location."
                : "Every part still has stock on the shelf for this location."
            }
            action={
              <Button variant="outline" onClick={() => setStatus("ALL")}>
                Show all parts
              </Button>
            }
          />
        ) : (
          <ul className={cn("space-y-2.5", isFetching && !isPending && "opacity-70")}>
            {visible.map((p) => {
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
