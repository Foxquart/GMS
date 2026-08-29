"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, ArrowLeft, X, Layers } from "lucide-react";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SectionHeader,
  Sheet,
  Skeleton,
} from "@/components/ui";
import { SpotTools } from "@/components/illustrations";
import { formatDate } from "@/lib/format";
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

// api() only surfaces the error message, so delete uses a raw fetch to read the
// error code and detect CATEGORY_IN_USE.
async function deleteCategoryRequest(id: string, force: boolean) {
  const res = await fetch(`/api/categories/${id}${force ? "?force=1" : ""}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(json?.error?.message ?? `Request failed (${res.status})`) as Error & {
      code?: string;
    };
    err.code = json?.error?.code;
    throw err;
  }
  return json?.data;
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inUseMessage, setInUseMessage] = useState<string | null>(null);

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
  };

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setConfirmDelete(false);
    setInUseMessage(null);
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setConfirmDelete(false);
    setInUseMessage(null);
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
    onError: (e: any) => toast.error(e.message),
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
    onError: (e: any) => toast.error(e.message),
  });

  const setArchived = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      api(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify({ isArchived }) }),
    onSuccess: (_data, vars) => {
      toast.success(vars.isArchived ? "Category archived" : "Category restored");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) => deleteCategoryRequest(id, force),
    onSuccess: (data: any) => {
      toast.success(
        data?.unlinkedParts
          ? `Category deleted — ${data.unlinkedParts} part(s) unlinked`
          : "Category deleted",
      );
      resetSheet();
      invalidate();
    },
    onError: (e: any) => {
      if (e?.code === "CATEGORY_IN_USE") {
        setInUseMessage(e.message);
      } else {
        toast.error(e.message);
      }
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-start justify-between gap-3">
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
            <p className="tile-label text-[var(--ink-label)]">Inventory</p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-[var(--ink)]">
              Categories
            </h1>
          </div>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus size={16} /> New
        </Button>
      </div>

      <div className="space-y-3">
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
            "inline-flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-xs font-extrabold",
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
            message={(error as Error)?.message ?? "The category list didn't load."}
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
            {categories.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] p-3.5",
                  c.isArchived ? "bg-[var(--surface)]" : "bg-[var(--surface-bright)]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[var(--ink)]">{c.name}</p>
                  {c.description && (
                    <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                      {c.description}
                    </p>
                  )}
                  <p className="mt-1 truncate text-xs text-[var(--ink-label)]">
                    Created {formatDate(c.createdAt)}
                    {c.updatedAt && c.updatedAt !== c.createdAt && (
                      <> · updated {formatDate(c.updatedAt)}</>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5">
                    {c.partsCount > 0 ? (
                      // The count alone left no way to actually see what is in
                      // a category; this drills through to the filtered list.
                      <Link href={`/inventory?categoryId=${c.id}`} aria-label={`View ${c.partsCount} parts in ${c.name}`}>
                        <Badge color="blue">
                          {c.partsCount} {c.partsCount === 1 ? "part" : "parts"}
                        </Badge>
                      </Link>
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={open} onClose={resetSheet} title={editing ? "Edit category" : "New category"}>
        <div className="space-y-3.5">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Brake system"
            />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
