"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, History, Package } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  CircleButton,
  EmptyState,
  ErrorState,
  SectionHeader,
  Skeleton,
  StickyControls,
  TruncatedNote,
} from "@/components/ui";
import { SpotTyre } from "@/components/illustrations";
import { formatDateTime } from "@/lib/format";
import { useGoBack } from "@/hooks/use-go-back";
import { cn } from "@/lib/cn";

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

const FILTERS = [
  { value: "", label: "Everywhere" },
  { value: "SHOP", label: "Shop" },
  { value: "WAREHOUSE", label: "Warehouse" },
];

export default function MovementsPage() {
  const goBack = useGoBack("/inventory");
  const searchParams = useSearchParams();
  const partId = searchParams.get("partId") ?? undefined;
  const [locationCode, setLocationCode] = useState("");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["movements", partId, locationCode],
    queryFn: () =>
      api<{ rows: any[]; total: number; limit: number }>("/api/inventory/movements", {
        params: { partId, locationCode: locationCode || undefined },
      }),
  });
  const movements = data?.rows;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Title and the one control that changes the log stay put; the
          sentence explaining what a movement is, and the “one part only”
          notice, are read once and then scroll away. */}
      <StickyControls className="space-y-3">
        <div className="flex items-center gap-3">
          <CircleButton onDark={false} onClick={goBack} aria-label="Back">
            <ArrowLeft size={18} />
          </CircleButton>
          <div className="min-w-0">
            <p className="tile-label hidden text-[var(--ink-label)] sm:block">Inventory</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
              Stock movements
            </h1>
          </div>
        </div>

        <div className="isolate flex select-none gap-1 rounded-full bg-[var(--surface-sunk)] p-1">
          {FILTERS.map((f) => {
            const active = locationCode === f.value;
            return (
              <button
                key={f.value || "ALL"}
                type="button"
                onClick={() => setLocationCode(f.value)}
                aria-pressed={active}
                className={cn(
                  "min-h-11 flex-1 cursor-pointer rounded-full py-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em]",
                  "transition-[background-color,color] duration-150 ease-out",
                  active
                    ? "bg-[var(--forest)] text-[var(--ink-on-dark)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </StickyControls>

      <p className="text-sm font-semibold text-[var(--ink-muted)]">
        Every stock-in, adjustment, transfer and job usage, newest first.
      </p>

      {partId && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--r-tile)] bg-[var(--surface-sunk)] px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[var(--ink-muted)]">
            <Package size={14} className="shrink-0" />
            <span className="truncate">Showing one part only</span>
          </span>
          <Link
            href={`/inventory/parts/${partId}`}
            className="shrink-0 text-xs font-extrabold text-[var(--ink)] underline underline-offset-4"
          >
            Open part
          </Link>
        </div>
      )}

      <section>
        <SectionHeader
          title="Movement log"
          icon={<History size={16} />}
          action={
            movements ? (
              <span className="tile-label text-[var(--ink-label)]">
                {movements.length} entries
              </span>
            ) : null
          }
        />

        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px]" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load the movement log"
            message={errorMessage(error)}
            reference={errorReference(error)}
            onRetry={() => refetch()}
          />
        ) : !movements?.length ? (
          <EmptyState
            illustration={<SpotTyre size={84} />}
            title="Nothing has moved yet"
            description={
              locationCode
                ? "No stock has moved in or out of this location."
                : "Stock-ins, adjustments and transfers will appear here as soon as they happen."
            }
            action={
              locationCode ? (
                <button
                  type="button"
                  onClick={() => setLocationCode("")}
                  className="cursor-pointer rounded-full bg-[var(--surface-sunk)] px-4 py-2 text-xs font-extrabold text-[var(--ink)] transition-[background-color] duration-150 ease-out hover:bg-[var(--hairline)]"
                >
                  Show every location
                </button>
              ) : null
            }
          />
        ) : (
          <ul className="space-y-2">
            {movements.map((m: any) => (
              <li
                key={m.id}
                className="flex items-start gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5"
              >
                <span
                  aria-hidden
                  className={cn(
                    "numeral flex h-11 shrink-0 items-center justify-center rounded-[var(--r-control)] px-2.5 text-sm",
                    m.quantity > 0
                      ? "bg-[var(--sage)] text-[var(--forest)]"
                      : "bg-[var(--terracotta)]/15 text-[var(--terracotta-hover)]",
                  )}
                >
                  {m.quantity > 0 ? "+" : ""}
                  {m.quantity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[var(--ink)]">{m.partName}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                    {m.locationCode === "SHOP" ? "Shop" : "Warehouse"} ·{" "}
                    {formatDateTime(m.createdAt)}
                  </p>
                  {m.notes && (
                    <p className="mt-1 truncate text-xs text-[var(--ink-label)]">{m.notes}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <Badge color={movementColor(m.movementType)}>
                    {movementLabel(m.movementType)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!isPending && !isError && (
          <TruncatedNote
            shown={movements?.length ?? 0}
            total={data?.total ?? 0}
            noun="movements"
            hint="filter by part or location to see further back"
          />
        )}
      </section>
    </div>
  );
}
