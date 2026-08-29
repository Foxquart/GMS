"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  MoveRight,
  ArrowLeft,
  Store,
  Warehouse,
  Search,
  X,
  Plus,
  Check,
  Layers,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiClientError, api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  Button,
  CircleButton,
  EmptyState,
  ErrorState,
  InlineError,
  Input,
  Panel,
  SectionHeader,
  Skeleton,
  StickyControls,
} from "@/components/ui";
import { SpotTools } from "@/components/illustrations";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type LocationCode = "SHOP" | "WAREHOUSE";

type Part = {
  id: string;
  name: string;
  partNumber: string | null;
  brand: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unit: string | null;
  shopStock: number;
  warehouseStock: number;
};

type Category = { id: string; name: string; partsCount: number };

/** One line in the basket: the part as last seen, plus how many to move. */
type Picked = { part: Part; qty: number | string };

const LOCATION_META: Record<LocationCode, { label: string; icon: typeof Store }> = {
  WAREHOUSE: { label: "Warehouse", icon: Warehouse },
  SHOP: { label: "Shop floor", icon: Store },
};

const stockAt = (part: Part, where: LocationCode) =>
  Number((where === "SHOP" ? part.shopStock : part.warehouseStock) ?? 0);

/** Idle, the list is a sample to recognise — searching is what narrows it. */
const IDLE_RESULTS = 6;
const SEARCH_RESULTS = 25;

export default function TransfersPage() {
  const router = useRouter();
  const qc = useQueryClient();

  // Which way the stock goes. The transfers table has always carried both
  // ends; only the screen assumed warehouse → shop.
  const [from, setFrom] = useState<LocationCode>("WAREHOUSE");
  const to: LocationCode = from === "WAREHOUSE" ? "SHOP" : "WAREHOUSE";

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [catIds, setCatIds] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [picked, setPicked] = useState<Record<string, Picked>>({});
  const [bulkPending, setBulkPending] = useState(false);
  const [moveError, setMoveError] = useState<{ message: string; reference?: string } | null>(null);

  // Anything the user changes about the move is their answer to the last
  // failure, so the message goes with it.
  const clearMoveError = () => setMoveError((prev) => (prev ? null : prev));

  // Typing searches on its own — this is a picker, not a filter you submit.
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/api/categories"),
  });

  const {
    data: parts,
    isPending: partsPending,
    isFetching: partsFetching,
    refetch: refetchParts,
  } = useQuery({
    queryKey: ["transfer-parts", search],
    queryFn: () => api<Part[]>("/api/parts", { params: { q: search || undefined } }),
    placeholderData: keepPreviousData,
  });

  const { data: transfers, isPending, isError, error, refetch } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => api<any[]>("/api/inventory/transfers"),
  });

  // Picked lines carry a snapshot of the part, because a part stays in the
  // basket after it drops out of the search results. Counts are read back off
  // the latest results at render, so a basket left open while someone sells
  // off the shelf shows what is really there rather than the snapshot.
  const lines = useMemo(
    () =>
      Object.values(picked).map((line) => {
        const fresh = parts?.find((p) => p.id === line.part.id);
        return fresh ? { ...line, part: fresh } : line;
      }),
    [picked, parts],
  );
  const totalUnits = lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  const overdrawn = lines.filter((l) => Number(l.qty) > stockAt(l.part, from));
  const invalid = lines.some((l) => !Number.isFinite(Number(l.qty)) || Number(l.qty) < 1);

  const visibleParts = useMemo(() => {
    const rows = parts ?? [];
    return catIds.length ? rows.filter((p) => p.categoryId && catIds.includes(p.categoryId)) : rows;
  }, [parts, catIds]);

  const narrowed = Boolean(search) || catIds.length > 0;
  const cap = showAll ? visibleParts.length : narrowed ? SEARCH_RESULTS : IDLE_RESULTS;
  const shown = visibleParts.slice(0, cap);

  const add = (part: Part, qty = 1) => {
    clearMoveError();
    setPicked((prev) => (prev[part.id] ? prev : { ...prev, [part.id]: { part, qty } }));
  };
  const remove = (id: string) => {
    clearMoveError();
    setPicked((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const setQty = (id: string, qty: number | string) => {
    clearMoveError();
    setPicked((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], qty } } : prev));
  };

  const swap = () => {
    const nextFrom = to;
    setFrom(nextFrom);
    clearMoveError();
    // What was available one way is not what is available the other, so every
    // line is pulled back to what the new source can actually give.
    setPicked(
      Object.fromEntries(
        lines.map((line) => [
          line.part.id,
          {
            ...line,
            qty: Math.max(1, Math.min(Number(line.qty) || 1, stockAt(line.part, nextFrom) || 1)),
          },
        ]),
      ),
    );
  };

  const toggleCategory = (id: string) => {
    setShowAll(false);
    setCatIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  /**
   * Add every part in the ticked categories. Fetched per category rather than
   * read off the search results, so "add all" means all of it — not just the
   * page of matches currently on screen.
   */
  const addSelectedCategories = async () => {
    if (!catIds.length) return;
    setBulkPending(true);
    try {
      const lists = await Promise.all(
        catIds.map((id) => api<Part[]>("/api/parts", { params: { categoryId: id } })),
      );
      const rows = lists.flat();
      const withStock = rows.filter((p) => stockAt(p, from) > 0);
      const empty = rows.length - withStock.length;

      const fresh = withStock.filter((p) => !picked[p.id]);
      const added = fresh.length;
      setPicked((prev) => {
        const next = { ...prev };
        for (const part of fresh) {
          if (!next[part.id]) next[part.id] = { part, qty: 1 };
        }
        return next;
      });
      clearMoveError();

      if (!added) {
        toast.info(
          withStock.length
            ? "Those parts are already on the list"
            : `Nothing in the ${LOCATION_META[from].label.toLowerCase()} to move from there`,
        );
      } else {
        toast.success(
          `${added} part${added === 1 ? "" : "s"} added${empty ? ` — ${empty} skipped with no stock` : ""}`,
        );
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBulkPending(false);
    }
  };

  const fillMax = () => {
    clearMoveError();
    setPicked(
      Object.fromEntries(
        lines.map((line) => [
          line.part.id,
          { ...line, qty: Math.max(1, stockAt(line.part, from)) },
        ]),
      ),
    );
  };

  const transfer = useMutation({
    mutationFn: () =>
      api("/api/inventory/transfers", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({ partId: l.part.id, quantity: Number(l.qty) })),
          fromLocationCode: from,
          toLocationCode: to,
        }),
      }),
    onSuccess: () => {
      toast.success(
        `${totalUnits} ${totalUnits === 1 ? "unit" : "units"} across ${lines.length} ${
          lines.length === 1 ? "part" : "parts"
        } moved to the ${LOCATION_META[to].label.toLowerCase()}`,
      );
      setPicked({});
      setMoveError(null);
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["transfer-parts"] });
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      // The basket is open and the numbers on it are what went wrong, so the
      // error sits with it rather than in a toast.
      if (err instanceof ApiClientError && err.code === "INSUFFICIENT_STOCK") {
        // The figures on screen are behind what the shelf holds — pulling
        // them fresh is the next step, so do it and say so.
        refetchParts();
        setMoveError({
          message: `${err.message} The counts have been refreshed — check them and try smaller quantities.`,
        });
        return;
      }
      setMoveError({ message: errorMessage(err), reference: errorReference(err) });
    },
  });

  const FromIcon = LOCATION_META[from].icon;
  const ToIcon = LOCATION_META[to].icon;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Pinned: the identity of the page and the way back. Picking and
          moving both scroll with everything else. */}
      <StickyControls>
        <div className="flex items-center gap-3">
          <CircleButton onDark={false} onClick={() => router.back()} aria-label="Back">
            <ArrowLeft size={18} />
          </CircleButton>
          <div className="min-w-0">
            <p className="tile-label hidden text-[var(--ink-label)] sm:block">Inventory</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
              Move stock
            </h1>
          </div>
        </div>
      </StickyControls>

      {/* ── Direction ──────────────────────────────────────────────── */}
      {/* First, because it decides which stock figure every row below shows. */}
      <div className="flex items-center gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5">
        <div className="min-w-0 flex-1">
          <p className="tile-label text-[var(--ink-label)]">From</p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-extrabold text-[var(--ink)]">
            <FromIcon size={14} className="shrink-0" /> {LOCATION_META[from].label}
          </p>
        </div>
        <CircleButton onDark={false} onClick={swap} aria-label="Swap direction" title="Swap direction">
          <ArrowLeftRight size={16} />
        </CircleButton>
        <div className="min-w-0 flex-1 text-right">
          <p className="tile-label text-[var(--ink-label)]">To</p>
          <p className="mt-1 flex items-center justify-end gap-1.5 truncate text-sm font-extrabold text-[var(--ink)]">
            <ToIcon size={14} className="shrink-0" /> {LOCATION_META[to].label}
          </p>
        </div>
      </div>

      {/* ── Pick parts ─────────────────────────────────────────────── */}
      <section className="space-y-2.5">
        <SectionHeader
          title="Find parts"
          icon={<Search size={16} />}
          action={
            <span className="tile-label text-[var(--ink-label)]">
              {partsFetching && !partsPending ? "Searching…" : `${visibleParts.length} found`}
            </span>
          }
        />

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
          />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowAll(false);
            }}
            placeholder="Search by name, part number, brand"
            aria-label="Search parts to move"
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

        {/* Categories are multi-select: a restock run is rarely one shelf. */}
        {!!categories?.length && (
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((c) => {
              const on = catIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-extrabold",
                    "transition-[background-color,color] duration-150 ease-out",
                    on
                      ? "bg-[var(--forest)] text-[var(--ink-on-dark)]"
                      : "bg-[var(--surface-sunk)] text-[var(--ink-muted)] hover:text-[var(--ink)]",
                  )}
                >
                  {on ? <Check size={12} /> : <Layers size={12} />}
                  {c.name}
                  <span className="numeral opacity-70">{c.partsCount}</span>
                </button>
              );
            })}
            {catIds.length > 0 && (
              <button
                type="button"
                onClick={() => setCatIds([])}
                className="px-2 text-xs font-bold text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)]"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {catIds.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={addSelectedCategories}
            disabled={bulkPending}
          >
            <Plus size={16} />
            {bulkPending
              ? "Adding…"
              : `Add everything in ${catIds.length} ${catIds.length === 1 ? "category" : "categories"}`}
          </Button>
        )}

        {partsPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[62px]" />
            ))}
          </div>
        ) : !visibleParts.length ? (
          <EmptyState
            illustration={<SpotTools size={72} />}
            title={search ? `Nothing matches “${search}”` : "No parts here"}
            description="Try another name, part number or brand — or pick a different category."
          />
        ) : (
          <>
            <ul className="space-y-2">
              {shown.map((p) => {
                const available = stockAt(p, from);
                const on = Boolean(picked[p.id]);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => (on ? remove(p.id) : add(p))}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-[var(--r-tile)] border p-3 text-left",
                        "transition-[background-color,border-color] duration-150 ease-out",
                        on
                          ? "border-[var(--forest)] bg-[var(--sage)]"
                          : "border-[var(--hairline)] bg-[var(--surface-bright)] hover:border-[var(--ink-label)]",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          on
                            ? "bg-[var(--forest)] text-[var(--ink-on-dark)]"
                            : "bg-[var(--surface-sunk)] text-[var(--ink-muted)]",
                        )}
                      >
                        {on ? <Check size={14} /> : <Plus size={14} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-[var(--ink)]">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs font-semibold text-[var(--ink-label)]">
                          {[p.partNumber, p.brand, p.categoryName].filter(Boolean).join(" · ") ||
                            "No part number"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tile-label block text-[var(--ink-label)]">
                          {LOCATION_META[from].label}
                        </span>
                        <span
                          className={cn(
                            "numeral text-base",
                            available > 0 ? "text-[var(--ink)]" : "text-[var(--ink-label)]",
                          )}
                        >
                          {available}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {visibleParts.length > shown.length && (
              <Button variant="ghost" className="w-full" onClick={() => setShowAll(true)}>
                Show all {visibleParts.length}
              </Button>
            )}
          </>
        )}
      </section>

      {/* ── The move ───────────────────────────────────────────────── */}
      <Panel
        title={
          lines.length
            ? `Moving ${lines.length} ${lines.length === 1 ? "part" : "parts"} · ${totalUnits} ${
                totalUnits === 1 ? "unit" : "units"
              }`
            : "Nothing picked yet"
        }
        icon={<ArrowLeftRight size={17} />}
      >
        {!lines.length ? (
          <p className="text-sm font-semibold text-[var(--ink-on-dark-muted)]">
            Search above and tap the parts to move. Tick categories to add whole shelves at once —
            everything picked moves together, in one transfer.
          </p>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="tile-label text-[var(--ink-on-dark-muted)]">
                {LOCATION_META[from].label} → {LOCATION_META[to].label}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fillMax}
                  className="text-xs font-bold text-[var(--ink-on-dark)] underline underline-offset-2"
                >
                  Fill max
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPicked({});
                    clearMoveError();
                  }}
                  className="text-xs font-bold text-[var(--ink-on-dark-muted)] underline underline-offset-2 hover:text-[var(--ink-on-dark)]"
                >
                  Clear all
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              {lines.map(({ part, qty }) => {
                const available = stockAt(part, from);
                const tooMany = Number(qty) > available;
                return (
                  <li
                    key={part.id}
                    className="flex items-center gap-2.5 rounded-[var(--r-tile)] bg-white/10 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[var(--ink-on-dark)]">
                        {part.name}
                      </p>
                      <p
                        className={cn(
                          "truncate text-xs font-semibold",
                          tooMany ? "text-[var(--ochre)]" : "text-[var(--ink-on-dark-muted)]",
                        )}
                      >
                        {tooMany
                          ? `Only ${available} ${part.unit || "pcs"} in the ${LOCATION_META[from].label.toLowerCase()}`
                          : `${available} available · ${stockAt(part, to)} at the ${LOCATION_META[to].label.toLowerCase()}`}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={available}
                      inputMode="numeric"
                      value={qty}
                      onChange={(e) => setQty(part.id, e.target.value)}
                      aria-label={`Quantity of ${part.name} to move`}
                      className="tabular h-10 w-[74px] shrink-0 px-2 text-center"
                    />
                    <CircleButton
                      onClick={() => remove(part.id)}
                      aria-label={`Remove ${part.name}`}
                      className="h-9 w-9 shrink-0"
                    >
                      <Trash2 size={15} />
                    </CircleButton>
                  </li>
                );
              })}
            </ul>

            {moveError && (
              // Light ground: the panel behind this is forest, and terracotta
              // ink on forest is unreadable.
              <InlineError
                message={moveError.message}
                reference={moveError.reference}
                className="bg-[var(--surface-bright)]"
              />
            )}

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => transfer.mutate()}
              disabled={transfer.isPending || invalid || overdrawn.length > 0}
            >
              <MoveRight size={16} />
              {transfer.isPending
                ? "Moving stock…"
                : overdrawn.length
                  ? `${overdrawn.length} line${overdrawn.length === 1 ? "" : "s"} over the count`
                  : `Move to ${LOCATION_META[to].label.toLowerCase()}`}
            </Button>
          </div>
        )}
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
            title="Couldn't load the transfer history"
            message={errorMessage(error)}
            reference={errorReference(error)}
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
            {transfers.map((t: any) => {
              const items = t.items ?? [];
              // A transfer can carry a whole shelf now — list the first few
              // and count the rest rather than growing a card without limit.
              const head = items.slice(0, 4);
              const rest = items.length - head.length;
              return (
                <li
                  key={t.id}
                  className="rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {head.map((it: any) => (
                        <p
                          key={it.id}
                          className="truncate text-sm font-extrabold text-[var(--ink)]"
                        >
                          {it.name ?? "Part"}{" "}
                          <span className="tabular text-[var(--ink-muted)]">× {it.quantity}</span>
                        </p>
                      ))}
                      {rest > 0 && (
                        <p className="text-xs font-bold text-[var(--ink-muted)]">
                          and {rest} more {rest === 1 ? "part" : "parts"}
                        </p>
                      )}
                      <p className="truncate text-xs font-semibold text-[var(--ink-label)]">
                        {formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Badge color={t.fromCode === "SHOP" ? "amber" : "blue"}>
                        {t.fromName ?? "Warehouse"} → {t.toName ?? "Shop"}
                      </Badge>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
