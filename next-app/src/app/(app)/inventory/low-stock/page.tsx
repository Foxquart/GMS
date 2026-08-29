"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeftRight, Package, Store, Warehouse } from "lucide-react";
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
import { currency } from "@/lib/format";
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

export default function LowStockPage() {
  const router = useRouter();

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

  return (
    <div className="space-y-5">
      {/* There is nothing to filter here, so only the identity of the page
          and the way out of it are pinned — one line, ~44px. The strapline and
          the two count tiles are read once and then scroll away. */}
      <StickyControls>
        <div className="flex items-center gap-3">
          <CircleButton onDark={false} onClick={() => router.back()} aria-label="Back">
            <span aria-hidden="true">←</span>
          </CircleButton>
          <div className="min-w-0">
            <p className="tile-label hidden text-[var(--ink-label)] sm:block">Inventory</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
              Low stock
            </h1>
          </div>
        </div>
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
                : "Shop floor or warehouse"
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
            !isPending && (
              <span className="tile-label text-[var(--ink-label)]">{rows.length} listed</span>
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
        ) : (
          <div className="space-y-2.5">
            {rows.map((r) => {
              const isOut = r.shopStock <= 0;
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
                        {r.warehouseShort && (
                          <Badge color="amber">
                            <Warehouse size={10} />
                            Warehouse {r.warehouseStock}/{r.minimumWarehouseStock}
                          </Badge>
                        )}
                      </div>
                      {/* What the last month actually got through. "3 left" is
                          a number; "3 left, and you used 14 last month" is a
                          decision. */}
                      <p className="mt-1.5 truncate text-[11px] font-semibold text-[var(--ink-label)]">
                        {usageLine(r)}
                      </p>
                    </div>

                    <div className="shrink-0 space-y-1 text-right">
                      <p className="tabular text-sm font-extrabold text-[var(--ink)]">
                        {currency(r.sellingPrice)}
                      </p>
                      <p className="text-[11px] font-semibold text-[var(--ink-muted)]">
                        {r.unit}
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
