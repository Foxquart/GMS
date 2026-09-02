"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowLeftRight, ArrowUpDown, Package, Store, Warehouse } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  BentoGrid,
  Button,
  CircleButton,
  EmptyState,
  ErrorState,
  SectionHeader,
  Skeleton,
  StatTile,
  StickyControls,
  Tile,
} from "@/components/ui";
import { SpotStamp } from "@/components/illustrations";
import { useGoBack } from "@/hooks/use-go-back";
import { cn } from "@/lib/cn";

type LowStockRow = {
  partId: string;
  name: string;
  partNumber: string | null;
  brand: string | null;
  unit: string;
  minimumShopStock: number;
  minimumWarehouseStock: number;
  sellingPrice: string;
  shopStock: number;
  warehouseStock: number;
  shopShort: boolean;
  warehouseShort: boolean;
  /** Units consumed by completed jobs over the last 30 days. */
  usedLast30Days: number;
};

/**
 * The usage line under a low-stock part.
 *
 * Stated as history, never as a forecast. A workshop's consumption is lumpy —
 * five brake pads on one busy Monday and none for a week — so "runs out in 2
 * days", extrapolated from a rate like that, would be wrong often enough that
 * the owner stops believing the whole page. "14 used in the last 30 days"
 * cannot be wrong, and it is the fact they were going to reorder against
 * anyway.
 */
function usageLine(row: LowStockRow) {
  const used = row.usedLast30Days ?? 0;
  if (used <= 0) return "Not used in the last 30 days";
  const onHand = row.shopStock + row.warehouseStock;
  const rate = `${used} used in the last 30 days`;
  // Only worth saying when there is genuinely less on the shelf than the month
  // just got through — that is the pairing that prompts an order.
  return onHand < used ? `${rate} · ${onHand} left everywhere` : rate;
}

/**
 * How many units short of its minimums a part is, across both locations.
 *
 * This is the reorder quantity, and it replaced the selling price in the
 * right-hand column. Selling price is what the customer pays — the correct
 * figure on a catalogue page and the wrong one here, where every row exists
 * because something needs buying or fetching. The page was showing the number
 * from the wrong decision.
 */
function shortBy(row: LowStockRow) {
  return (
    Math.max(0, row.minimumShopStock - row.shopStock) +
    Math.max(0, row.minimumWarehouseStock - row.warehouseStock)
  );
}

/**
 * The four ways to slice this list, in the order the question gets asked.
 *
 * These are not the same axis as the two tiles above them. "Out of stock" and
 * "below minimum" describe a *state*; these describe what to *do* about it —
 * fetch it from the back, or order it. A part short on the floor with plenty
 * in the warehouse needs a two-minute walk, not a purchase order, and nothing
 * on the page used to separate those two piles.
 */
const FILTERS = [
  { id: "all", label: "All" },
  { id: "empty", label: "Shop empty" },
  { id: "cover", label: "Can cover" },
  { id: "order", label: "Must order" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export default function LowStockPage() {
  const goBack = useGoBack("/inventory");
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<"urgent" | "used">("urgent");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: () => api<LowStockRow[]>("/api/inventory/low-stock"),
  });

  const rows = data ?? [];
  const out = rows.filter((r) => r.shopStock <= 0);
  const low = rows.filter((r) => r.shopStock > 0);
  const warehouseOnly = rows.filter((r) => !r.shopShort && r.warehouseShort);
  // Worth flagging: it is short on the floor but there is stock out back.
  const coverable = rows.filter((r) => r.shopStock < r.minimumShopStock && r.warehouseStock > 0);
  // Short on the floor with nothing behind it — the only pile that needs a
  // supplier.
  const mustOrder = rows.filter((r) => r.shopShort && r.warehouseStock <= 0);

  const counts: Record<FilterId, number> = {
    all: rows.length,
    empty: out.length,
    cover: coverable.length,
    order: mustOrder.length,
  };

  const visible = useMemo(() => {
    const pick =
      filter === "empty"
        ? out
        : filter === "cover"
          ? coverable
          : filter === "order"
            ? mustOrder
            : rows;
    // The server already returns emptiest-shop-first, which is the urgency
    // order; sorting by usage answers the other question — of the things I am
    // short of, which do I actually get through.
    return sort === "used"
      ? [...pick].sort((a, b) => (b.usedLast30Days ?? 0) - (a.usedLast30Days ?? 0))
      : pick;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filter, sort]);

  return (
    <div className="space-y-5">
      {/* The identity of the page, the way out of it, and the filter — pinned
          together, because on a list this long the filter is useless at the
          top of a page you have already scrolled past. The strapline and the
          count tiles are read once and then scroll away. */}
      <StickyControls className="space-y-3">
        <div className="flex items-center gap-3">
          {/* The lucide icon, like every other back control in the app. This
              was the one place drawing a literal "←" character, which renders
              at whatever weight the text font gives it rather than matching
              the 18px stroked arrow everywhere else. */}
          <CircleButton onDark={false} onClick={goBack} aria-label="Back">
            <ArrowLeft size={18} />
          </CircleButton>
          <div className="min-w-0">
            <p className="tile-label hidden text-[var(--ink-label)] sm:block">Inventory</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
              Low stock
            </h1>
          </div>
        </div>

        {!isPending && rows.length > 0 && (
          // Wraps rather than clipping or scrolling sideways: at a large text
          // size four chips do not fit one line on a 360px phone, and a hidden
          // filter is a filter nobody uses.
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              const count = counts[f.id];
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  disabled={count === 0 && f.id !== "all"}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5",
                    "text-xs font-bold transition-colors duration-150 ease-out",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    active
                      ? "border-transparent bg-[var(--forest)] text-[var(--ink-on-dark)]"
                      : "border-[var(--hairline)] bg-[var(--surface-bright)] text-[var(--ink-muted)] hover:border-[var(--hairline-strong)] hover:text-[var(--ink)]",
                  )}
                >
                  {f.label}
                  <span className={cn("tabular", active ? "opacity-70" : "opacity-60")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </StickyControls>

      <p className="text-sm font-semibold text-[var(--ink-muted)]">
        Parts below their minimum on the shop floor or in the warehouse.
      </p>

      {isPending ? (
        <BentoGrid>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </BentoGrid>
      ) : (
        <BentoGrid>
          <StatTile
            label="Out of stock"
            value={String(out.length)}
            footnote="Nothing on the shop floor"
            tone={out.length ? "terracotta" : "cream"}
            icon={<Package size={16} />}
          />
          <StatTile
            label="Below minimum"
            value={String(low.length)}
            footnote={
              warehouseOnly.length
                ? `${warehouseOnly.length} in the warehouse only`
                : "Shop or warehouse"
            }
            tone={low.length ? "ochre" : "cream"}
            icon={<AlertTriangle size={16} />}
          />
        </BentoGrid>
      )}

      {coverable.length > 0 && (
        <Tile tone="sage" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold">
              {coverable.length} can be covered from the warehouse
            </p>
            <p className="mt-0.5 text-xs font-semibold text-[var(--forest)]/70">
              Move stock instead of ordering more.
            </p>
          </div>
          <Link href="/inventory/transfers" className="shrink-0">
            <Button size="sm" variant="outline">
              <ArrowLeftRight size={14} /> Transfer
            </Button>
          </Link>
        </Tile>
      )}

      <section>
        <SectionHeader
          title="Needs attention"
          icon={<AlertTriangle size={18} />}
          action={
            !isPending &&
            rows.length > 0 && (
              // Two orderings, because there are two questions: what is most
              // urgent, and — of the things I am short of — what do I actually
              // get through. A toggle rather than a dropdown: with two options
              // a select costs a tap and a modal to say the same thing.
              <button
                type="button"
                onClick={() => setSort((s) => (s === "urgent" ? "used" : "urgent"))}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs font-bold text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:text-[var(--ink)]"
              >
                <ArrowUpDown size={13} aria-hidden="true" />
                {sort === "urgent" ? "Most urgent" : "Most used"}
                <span className="sr-only">, tap to change sort order</span>
              </button>
            )
          }
        />

        {isPending ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.75rem]" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load your low-stock list"
            message={errorMessage(error)}
            reference={errorReference(error)}
            onRetry={() => refetch()}
          />
        ) : !rows.length ? (
          <EmptyState
            title="Everything is above its minimum"
            description="No part has fallen below the shop level you set for it."
            illustration={<SpotStamp size={84} />}
            action={
              <Link href="/inventory">
                <Button variant="outline">Back to inventory</Button>
              </Link>
            }
          />
        ) : !visible.length ? (
          // A filter that matches nothing is a different situation from a
          // shelf that is fully stocked, and it needs a way out rather than
          // the "everything is fine" illustration.
          <Tile tone="cream" className="p-5 text-center">
            <p className="text-sm font-bold text-[var(--ink)]">
              Nothing in “{FILTERS.find((f) => f.id === filter)?.label}”
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--ink-muted)]">
              {filter === "order"
                ? "Everything short on the floor can be covered from the warehouse."
                : "No part matches this filter right now."}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilter("all")}>
              Show all {rows.length}
            </Button>
          </Tile>
        ) : (
          <div className="space-y-2.5">
            {visible.map((r) => {
              const isOut = r.shopStock <= 0;
              const short = shortBy(r);
              return (
                <Link key={r.partId} href={`/inventory/parts/${r.partId}`} className="block">
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--r-card)] border bg-[var(--surface-bright)] p-4",
                      "transition-[border-color] duration-150 ease-out hover:border-[var(--hairline-strong)]",
                      isOut ? "border-[var(--terracotta)]/35" : "border-[var(--hairline)]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-tile)]",
                        isOut
                          ? "bg-[var(--terracotta)]/12 text-[var(--terracotta)]"
                          : "bg-[var(--ochre)]/20 text-[var(--ochre-ink)]",
                      )}
                    >
                      <Package size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[var(--ink)]">{r.name}</p>
                      <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                        {r.partNumber ? `#${r.partNumber}` : "No part number"}
                        {r.brand ? ` · ${r.brand}` : ""}
                      </p>
                      {/* Where the shortfall is, as badges rather than a
                          sentence — with 170 parts listed you scan this column
                          rather than read it. Each badge names its location and
                          shows the count against its minimum, so colour is
                          never carrying the meaning on its own. */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {isOut ? (
                          <Badge color="red">
                            <Store size={10} />
                            Shop empty
                          </Badge>
                        ) : (
                          r.shopShort && (
                            <Badge color="amber">
                              <Store size={10} />
                              Shop {r.shopStock}/{r.minimumShopStock}
                            </Badge>
                          )
                        )}
                        {/* The warehouse used to top out at amber however
                            empty it was, so "nothing left in the back" looked
                            no worse than "getting low" — while the shop got a
                            red for the same state. Both locations now use the
                            same two steps. */}
                        {r.warehouseStock <= 0 ? (
                          <Badge color="red">
                            <Warehouse size={10} />
                            Warehouse empty
                          </Badge>
                        ) : (
                          r.warehouseShort && (
                            <Badge color="amber">
                              <Warehouse size={10} />
                              Warehouse {r.warehouseStock}/{r.minimumWarehouseStock}
                            </Badge>
                          )
                        )}
                      </div>
                      {/* What the last month actually got through. "3 left" is
                          a number; "3 left, and you used 14 last month" is a
                          decision. */}
                      <p className="mt-1.5 truncate text-[11px] font-semibold text-[var(--ink-label)]">
                        {usageLine(r)}
                      </p>
                    </div>

                    {/* The reorder quantity, not the selling price. Every row
                        here exists because something needs buying or fetching,
                        and how many is the number that decision turns on —
                        what the customer would pay for it is a fact from a
                        different screen. */}
                    <div className="shrink-0 space-y-0.5 text-right">
                      <p className="numeral text-lg leading-none text-[var(--ink)]">{short}</p>
                      <p className="text-[11px] font-semibold text-[var(--ink-muted)]">
                        {r.unit} short
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
