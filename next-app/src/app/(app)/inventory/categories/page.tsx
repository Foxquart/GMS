"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, ArrowLeft, X, Layers, ChevronDown, Package } from "lucide-react";
import { ApiClientError, api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  Input,
  SectionHeader,
  Sheet,
  Skeleton,
  StickyControls,
} from "@/components/ui";
import { SpotTools } from "@/components/illustrations";
import { currency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type Category = {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  partsCount: number;
};

/** What went wrong inside the open sheet, shown next to the fields. */
type SheetError = { message: string; reference?: string };

const asSheetError = (err: unknown): SheetError => ({
  message: errorMessage(err),
  reference: errorReference(err),
});

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [open, setOpen] = useState(false);
  // Multiple categories can be open at once — comparing two categories'
  // contents is the common reason to expand them in the first place.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inUseMessage, setInUseMessage] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<SheetError | null>(null);

  // Typing is the answer to the last failure, so it stops being shown.
  const clearSheetError = () => setSheetError((prev) => (prev ? null : prev));

  const { data: categories, isPending, isError, error, refetch } = useQuery({
    queryKey: ["categories", search, showArchived],
    queryFn: () =>
      api<Category[]>("/api/categories", {
        params: { q: search || undefined, archived: showArchived ? "1" : undefined },
      }),
  });

  const resetSheet = () => {
    setOpen(false);
    setEditing(null);
    setName("");
    setDescription("");
    setConfirmDelete(false);
    setInUseMessage(null);
    setSheetError(null);
  };

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setConfirmDelete(false);
    setInUseMessage(null);
    setSheetError(null);
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setConfirmDelete(false);
    setInUseMessage(null);
    setSheetError(null);
    setOpen(true);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: () =>
      api("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined }),
      }),
    onSuccess: () => {
      toast.success("Category created");
      resetSheet();
      invalidate();
    },
    // The sheet stays open on failure, so the error goes in it — a toast
    // would slide away from the fields that need changing.
    onError: (err) => setSheetError(asSheetError(err)),
  });

  const save = useMutation({
    mutationFn: () =>
      api(`/api/categories/${editing!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description }),
      }),
    onSuccess: () => {
      toast.success("Category updated");
      resetSheet();
      invalidate();
    },
    onError: (err) => setSheetError(asSheetError(err)),
  });

  const setArchived = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      api(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify({ isArchived }) }),
    onSuccess: (_data, vars) => {
      toast.success(vars.isArchived ? "Category archived" : "Category restored");
      invalidate();
    },
    // A row action with nothing open to put an error next to.
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      api<{ id: string; unlinkedParts: number }>(`/api/categories/${id}`, {
        method: "DELETE",
        params: force ? { force: "1" } : undefined,
      }),
    onSuccess: (data: any) => {
      toast.success(
        data?.unlinkedParts
          ? `Category deleted — ${data.unlinkedParts} part(s) unlinked`
          : "Category deleted",
      );
      resetSheet();
      invalidate();
    },
    onError: (err) => {
      // The parts are still filed under it. That is not a dead end: the
      // confirm turns into "Delete anyway", which unlinks them.
      if (err instanceof ApiClientError && err.code === "CATEGORY_IN_USE") {
        setInUseMessage(err.message);
        return;
      }
      setSheetError(asSheetError(err));
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Pinned: where you are, the way back, the way to add one, and the two
          controls that change what the list below shows. The eyebrow is the
          only thing dropped on a phone — 12px of label is not worth the room
          when the back button already says where this sits. */}
      <StickyControls className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/inventory"
              aria-label="Back to inventory"
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                "bg-[var(--surface-sunk)] text-[var(--ink)]",
                "transition-[background-color,transform] duration-150 ease-out",
                "hover:bg-[var(--hairline)] active:scale-90",
              )}
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="tile-label hidden text-[var(--ink-label)] sm:block">Inventory</p>
              <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl">
                Categories
              </h1>
            </div>
          </div>
          <Button onClick={openNew} className="shrink-0">
            <Plus size={16} /> New
          </Button>
        </div>

        {/* One wrapping row: the search takes the width it can get and the
            archived switch sits beside it, so the pinned area stays two lines
            on a phone instead of three. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[11rem] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
              onBlur={() => setSearch(q)}
              placeholder="Search categories"
              aria-label="Search categories"
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

          <button
            type="button"
            role="switch"
            aria-checked={showArchived}
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 text-xs font-extrabold",
              "transition-[background-color,color] duration-150 ease-out",
              showArchived
                ? "bg-[var(--forest)] text-[var(--ink-on-dark)] hover:bg-[var(--forest-hover)]"
                : "bg-[var(--surface-sunk)] text-[var(--ink-muted)] hover:text-[var(--ink)]",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                showArchived ? "bg-[var(--ochre)]" : "bg-[var(--ink-label)]",
              )}
            />
            Show archived
          </button>
        </div>
      </StickyControls>

      <section>
        <SectionHeader
          title={showArchived ? "All categories" : "Active categories"}
          icon={<Layers size={16} />}
          action={
            categories ? (
              <span className="tile-label text-[var(--ink-label)]">{categories.length} listed</span>
            ) : null
          }
        />

        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[74px]" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load your categories"
            message={errorMessage(error)}
            reference={errorReference(error)}
            onRetry={() => refetch()}
          />
        ) : !categories?.length ? (
          <EmptyState
            illustration={<SpotTools size={84} />}
            title={search ? "No categories match that search" : "No categories yet"}
            description={
              search
                ? "Try a shorter search, or clear it to see every category."
                : "Group parts into categories — brakes, filters, lubricants — so the counter can find them fast."
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
                <Button onClick={openNew}>
                  <Plus size={16} /> New category
                </Button>
              )
            }
          />
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => {
              const isOpen = expanded.has(c.id);
              // A category with nothing filed under it opens onto nothing, so
              // it is not offered as expandable at all — no pointer, no
              // toggle, no dead end.
              const canExpand = c.partsCount > 0;

              return (
                <li
                  key={c.id}
                  className={cn(
                    "rounded-[var(--r-tile)] border border-[var(--hairline)] p-3.5",
                    // Clears the pinned bar if focus or a scrollIntoView brings
                    // a row up from below.
                    "scroll-mt-44 lg:scroll-mt-32",
                    "transition-[background-color] duration-150 ease-out",
                    c.isArchived ? "bg-[var(--surface)]" : "bg-[var(--surface-bright)]",
                    canExpand &&
                      (c.isArchived
                        ? "cursor-pointer hover:bg-[var(--surface-sunk)]"
                        : "cursor-pointer hover:bg-[var(--surface)]"),
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* The identity block is the toggle, stretched by negative
                        margins into the row's own padding so the whole left side
                        is a real hit target. Edit and Archive stay siblings —
                        buttons cannot be nested inside a button. */}
                    {canExpand ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(c.id)}
                        aria-expanded={isOpen}
                        aria-controls={`cat-parts-${c.id}`}
                        className={cn(
                          "-my-3.5 -ml-3.5 min-w-0 flex-1 cursor-pointer rounded-[var(--r-tile)] py-3.5 pl-3.5 text-left",
                          "scroll-mt-44 lg:scroll-mt-32",
                        )}
                      >
                        <CategoryIdentity category={c} />
                      </button>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <CategoryIdentity category={c} />
                      </div>
                    )}

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5">
                        {canExpand ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(c.id)}
                            aria-expanded={isOpen}
                            aria-controls={`cat-parts-${c.id}`}
                            aria-label={`${isOpen ? "Hide" : "Show"} the ${c.partsCount} parts in ${c.name}`}
                            className="cursor-pointer"
                          >
                            <Badge color="blue">
                              {c.partsCount} {c.partsCount === 1 ? "part" : "parts"}
                              <ChevronDown
                                size={12}
                                className={cn(
                                  "transition-transform duration-150 ease-out",
                                  isOpen && "rotate-180",
                                )}
                              />
                            </Badge>
                          </button>
                        ) : (
                          <Badge color="gray">0 parts</Badge>
                        )}
                        {c.isArchived && <Badge color="gray">Archived</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          aria-label={`Edit ${c.name}`}
                          className={cn(
                            "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--ink-label)]",
                            "transition-[background-color,color] duration-150 ease-out",
                            "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
                          )}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setArchived.mutate({ id: c.id, isArchived: !c.isArchived })}
                          disabled={setArchived.isPending}
                          className={cn(
                            "cursor-pointer rounded-full px-2.5 py-1.5 text-xs font-bold text-[var(--ink-label)]",
                            "transition-[background-color,color] duration-150 ease-out",
                            "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
                            "disabled:pointer-events-none disabled:opacity-45",
                          )}
                        >
                          {c.isArchived ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isOpen && <CategoryParts id={c.id} name={c.name} count={c.partsCount} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Sheet open={open} onClose={resetSheet} title={editing ? "Edit category" : "New category"}>
        <div className="space-y-3.5">
          {sheetError && (
            <InlineError message={sheetError.message} reference={sheetError.reference} />
          )}
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearSheetError();
              }}
              placeholder="Brake system"
            />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearSheetError();
              }}
              placeholder="Pads, discs, callipers and fluid"
            />
          </Field>

          {editing ? (
            <>
              <Button
                className="w-full"
                size="lg"
                onClick={() => save.mutate()}
                disabled={!name || save.isPending}
              >
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>

              {!confirmDelete ? (
                <button
                  onClick={() => {
                    setConfirmDelete(true);
                    setInUseMessage(null);
                    setSheetError(null);
                  }}
                  className={cn(
                    "w-full cursor-pointer rounded-full px-2 py-2 text-xs font-bold text-[var(--ink-label)]",
                    "transition-[background-color,color] duration-150 ease-out",
                    "hover:bg-[var(--terracotta)]/10 hover:text-[var(--terracotta-hover)]",
                  )}
                >
                  Delete category
                </button>
              ) : (
                <div className="space-y-3 rounded-[var(--r-tile)] border border-[var(--terracotta)]/25 bg-[var(--terracotta)]/8 p-3.5">
                  <p className="text-xs font-semibold leading-relaxed text-[var(--ink-muted)]">
                    {inUseMessage ?? `Delete “${editing.name}” permanently? This cannot be undone.`}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setConfirmDelete(false);
                        setInUseMessage(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: editing.id, force: Boolean(inUseMessage) })}
                    >
                      {inUseMessage
                        ? `Delete anyway (unlink ${editing.partsCount} part${editing.partsCount === 1 ? "" : "s"})`
                        : "Delete"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={() => create.mutate()}
              disabled={!name || create.isPending}
            >
              {create.isPending ? "Creating…" : "Create category"}
            </Button>
          )}
        </div>
      </Sheet>
    </div>
  );
}

/**
 * Name, description and dates — the half of the row that opens it. Spans, not
 * paragraphs: this renders inside a <button>, which only accepts phrasing
 * content.
 */
function CategoryIdentity({ category }: { category: Category }) {
  return (
    <>
      <span className="block truncate text-sm font-extrabold text-[var(--ink)]">
        {category.name}
      </span>
      {category.description && (
        <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--ink-muted)]">
          {category.description}
        </span>
      )}
      <span className="mt-1 block truncate text-xs text-[var(--ink-label)]">
        Created {formatDate(category.createdAt)}
        {category.updatedAt && category.updatedAt !== category.createdAt && (
          <> · updated {formatDate(category.updatedAt)}</>
        )}
      </span>
    </>
  );
}

/**
 * The parts filed under one category, fetched only once its row is opened.
 * Loading them all up-front would mean one request per category on a page
 * whose main job is just listing the categories.
 */
function CategoryParts({ id, name, count }: { id: string; name: string; count: number }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["parts", "by-category", id],
    queryFn: () => api<any[]>("/api/parts", { params: { categoryId: id } }),
  });

  return (
    <div
      id={`cat-parts-${id}`}
      className="mt-3 border-t border-[var(--hairline)] pt-3"
    >
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--ink-muted)]">
          <span>Couldn&apos;t load these parts.</span>
          <button
            onClick={() => refetch()}
            className="cursor-pointer font-bold text-[var(--ink)] underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      ) : !data?.length ? (
        <p className="text-xs font-semibold text-[var(--ink-muted)]">
          Nothing is filed under {name} yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {data.map((p: any) => (
            <li key={p.id}>
              <Link
                href={`/inventory/parts/${p.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--r-tile)] bg-[var(--surface)] px-3 py-2.5",
                  "transition-colors duration-150 ease-out hover:bg-[var(--surface-sunk)]",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sage)] text-[var(--forest)]">
                  <Package size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-[var(--ink)]">{p.name}</p>
                  <p className="truncate text-[11px] font-semibold text-[var(--ink-muted)]">
                    {p.partNumber ? `#${p.partNumber}` : "No part number"}
                    {p.brand ? ` · ${p.brand}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-xs font-extrabold text-[var(--ink)]">
                    {currency(p.sellingPrice)}
                  </p>
                  <p className="tabular text-[11px] font-semibold text-[var(--ink-muted)]">
                    Shop {p.shopStock ?? 0} · W/h {p.warehouseStock ?? 0}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
