"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { ApiClientError, api, errorMessage, errorReference } from "@/lib/api";
import { Badge, Button, Field, InlineError, Input, Sheet } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Category, SheetError, SubCategory } from "@/components/inventory-types";

const asSheetError = (err: unknown): SheetError => ({
  message: errorMessage(err),
  reference: errorReference(err),
});

/** Anything that changes a category also changes what hangs off it. */
function useInvalidateTaxonomy() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["subcategories"] });
    qc.invalidateQueries({ queryKey: ["category"] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
  };
}

/**
 * Create or edit one category. Archiving and deleting live here too — both are
 * rare enough that putting them on every tile made the grid noisier for
 * everyone to serve almost nobody.
 *
 * `onGone` fires when the category stops existing or stops being listed, so a
 * caller that is *inside* that category can leave rather than sit on a page
 * describing something that is no longer there.
 */
export function CategorySheet({
  open,
  onClose,
  editing,
  onGone,
}: {
  open: boolean;
  onClose: () => void;
  /** null creates a new one. */
  editing: Category | null;
  onGone?: (id: string) => void;
}) {
  const invalidate = useInvalidateTaxonomy();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inUse, setInUse] = useState<string | null>(null);
  const [error, setError] = useState<SheetError | null>(null);

  // Seeded from the record the sheet was opened with, keyed so switching from
  // one category to another (or to "new") starts clean instead of carrying the
  // previous record's text.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const key = editing?.id ?? "__new__";
  if (open && seededFor !== key) {
    setSeededFor(key);
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setConfirmDelete(false);
    setInUse(null);
    setError(null);
  }

  const close = () => {
    setSeededFor(null);
    onClose();
  };

  const create = useMutation({
    mutationFn: () =>
      api("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined }),
      }),
    onSuccess: () => {
      toast.success("Category created");
      close();
      invalidate();
    },
    // The sheet stays open on failure, so the error goes in it — a toast would
    // slide away from the fields that need changing.
    onError: (err) => setError(asSheetError(err)),
  });

  const save = useMutation({
    mutationFn: () =>
      api(`/api/categories/${editing!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description }),
      }),
    onSuccess: () => {
      toast.success("Category updated");
      close();
      invalidate();
    },
    onError: (err) => setError(asSheetError(err)),
  });

  const setArchived = useMutation({
    mutationFn: () =>
      api(`/api/categories/${editing!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isArchived: !editing!.isArchived }),
      }),
    onSuccess: () => {
      toast.success(editing!.isArchived ? "Category restored" : "Category archived");
      close();
      invalidate();
    },
    onError: (err) => setError(asSheetError(err)),
  });

  const remove = useMutation({
    mutationFn: ({ force }: { force: boolean }) =>
      api<{ id: string; unlinkedParts: number; deletedSubCategories: number }>(
        `/api/categories/${editing!.id}`,
        { method: "DELETE", params: force ? { force: "1" } : undefined },
      ),
    onSuccess: (data) => {
      const bits = [
        data?.unlinkedParts ? `${data.unlinkedParts} part(s) unlinked` : null,
        data?.deletedSubCategories
          ? `${data.deletedSubCategories} sub-categor${data.deletedSubCategories === 1 ? "y" : "ies"} removed`
          : null,
      ].filter(Boolean);
      toast.success(bits.length ? `Category deleted — ${bits.join(", ")}` : "Category deleted");
      const goneId = editing!.id;
      close();
      invalidate();
      onGone?.(goneId);
    },
    onError: (err) => {
      // The parts are still filed under it. That is not a dead end: the confirm
      // turns into "Delete anyway", which unlinks them.
      if (err instanceof ApiClientError && err.code === "CATEGORY_IN_USE") {
        setInUse(err.message);
        return;
      }
      setError(asSheetError(err));
    },
  });

  return (
    <Sheet open={open} onClose={close} title={editing ? "Edit category" : "New category"}>
      <div className="space-y-3.5">
        {error && <InlineError message={error.message} reference={error.reference} />}
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Royal Enfield"
          />
        </Field>
        <Field label="Description">
          <Input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError(null);
            }}
            placeholder="Everything that fits a Royal Enfield"
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

            <Button
              variant="outline"
              className="w-full"
              disabled={setArchived.isPending}
              onClick={() => setArchived.mutate()}
            >
              {editing.isArchived ? "Restore category" : "Archive category"}
            </Button>

            {!confirmDelete ? (
              <button
                onClick={() => {
                  setConfirmDelete(true);
                  setInUse(null);
                  setError(null);
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
                  {inUse ?? `Delete “${editing.name}” permanently? This cannot be undone.`}
                </p>
                {editing.subCategoryCount > 0 && (
                  <p className="text-xs font-semibold leading-relaxed text-[var(--ink-muted)]">
                    Its {editing.subCategoryCount} sub-categor
                    {editing.subCategoryCount === 1 ? "y" : "ies"} will be unlinked, and any that
                    are filed under no other category will be deleted with it.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setConfirmDelete(false);
                      setInUse(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ force: Boolean(inUse) })}
                  >
                    {inUse
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
  );
}

/**
 * Create or edit one sub-category.
 *
 * The categories list is the whole point of the many-to-many: one "Back lamp"
 * listed under Royal Enfield *and* Pulsar, rather than two rows that happen to
 * share a name. At least one must be ticked, which is why a new one always
 * opens with `defaultCategoryId` already selected — the rule is satisfied
 * before the first keystroke rather than enforced by a rejection afterwards.
 */
export function SubCategorySheet({
  open,
  onClose,
  editing,
  defaultCategoryId,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  editing: SubCategory | null;
  defaultCategoryId?: string;
  categories: Category[] | undefined;
}) {
  const invalidate = useInvalidateTaxonomy();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inUse, setInUse] = useState<string | null>(null);
  const [error, setError] = useState<SheetError | null>(null);

  const [seededFor, setSeededFor] = useState<string | null>(null);
  const key = editing?.id ?? `__new__${defaultCategoryId ?? ""}`;
  if (open && seededFor !== key) {
    setSeededFor(key);
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setCategoryIds(
      editing
        ? editing.categories.map((c) => c.id)
        : defaultCategoryId
          ? [defaultCategoryId]
          : [],
    );
    setConfirmDelete(false);
    setInUse(null);
    setError(null);
  }

  const close = () => {
    setSeededFor(null);
    onClose();
  };

  const toggle = (id: string) => {
    setError(null);
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const create = useMutation({
    mutationFn: () =>
      api("/api/subcategories", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined, categoryIds }),
      }),
    onSuccess: () => {
      toast.success("Sub-category created");
      close();
      invalidate();
    },
    onError: (err) => setError(asSheetError(err)),
  });

  const save = useMutation({
    mutationFn: () =>
      api(`/api/subcategories/${editing!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description, categoryIds }),
      }),
    onSuccess: () => {
      toast.success("Sub-category updated");
      close();
      invalidate();
    },
    onError: (err) => setError(asSheetError(err)),
  });

  const remove = useMutation({
    mutationFn: ({ force }: { force: boolean }) =>
      api<{ id: string; unlinkedParts: number }>(`/api/subcategories/${editing!.id}`, {
        method: "DELETE",
        params: force ? { force: "1" } : undefined,
      }),
    onSuccess: (data) => {
      toast.success(
        data?.unlinkedParts
          ? `Sub-category deleted — ${data.unlinkedParts} part(s) unlinked`
          : "Sub-category deleted",
      );
      close();
      invalidate();
    },
    onError: (err) => {
      if (err instanceof ApiClientError && err.code === "SUBCATEGORY_IN_USE") {
        setInUse(err.message);
        return;
      }
      setError(asSheetError(err));
    },
  });

  const saving = create.isPending || save.isPending;

  return (
    <Sheet open={open} onClose={close} title={editing ? "Edit sub-category" : "New sub-category"}>
      <div className="space-y-3.5">
        {error && <InlineError message={error.message} reference={error.reference} />}
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Back lamp"
          />
        </Field>
        <Field label="Description">
          <Input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError(null);
            }}
            placeholder="Tail lamps, lenses and holders"
          />
        </Field>

        <Field
          label="Categories"
          hint="A sub-category always belongs to at least one category, and can belong to several."
        >
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface)] p-2">
            {!categories?.length ? (
              <p className="px-2 py-3 text-xs font-semibold text-[var(--ink-muted)]">
                Create a category first — there is nothing to file this under yet.
              </p>
            ) : (
              categories.map((c) => {
                const checked = categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(c.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--r-tile)] px-2.5 py-2 text-left",
                      "transition-[background-color] duration-150 ease-out",
                      checked ? "bg-[var(--sage)]" : "hover:bg-[var(--surface-sunk)]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        checked
                          ? "border-[var(--forest)] bg-[var(--forest)] text-[var(--ink-on-dark)]"
                          : "border-[var(--hairline-strong)] bg-[var(--surface-bright)]",
                      )}
                    >
                      {checked && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-xs font-extrabold",
                        checked ? "text-[var(--forest)]" : "text-[var(--ink)]",
                      )}
                    >
                      {c.name}
                    </span>
                    {c.isArchived && <Badge color="gray">Archived</Badge>}
                  </button>
                );
              })
            )}
          </div>
        </Field>

        <Button
          className="w-full"
          size="lg"
          onClick={() => (editing ? save : create).mutate()}
          disabled={!name || !categoryIds.length || saving}
        >
          {saving
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save changes"
              : "Create sub-category"}
        </Button>

        {editing &&
          (!confirmDelete ? (
            <button
              onClick={() => {
                setConfirmDelete(true);
                setInUse(null);
                setError(null);
              }}
              className={cn(
                "w-full cursor-pointer rounded-full px-2 py-2 text-xs font-bold text-[var(--ink-label)]",
                "transition-[background-color,color] duration-150 ease-out",
                "hover:bg-[var(--terracotta)]/10 hover:text-[var(--terracotta-hover)]",
              )}
            >
              Delete sub-category
            </button>
          ) : (
            <div className="space-y-3 rounded-[var(--r-tile)] border border-[var(--terracotta)]/25 bg-[var(--terracotta)]/8 p-3.5">
              <p className="text-xs font-semibold leading-relaxed text-[var(--ink-muted)]">
                {inUse ??
                  `Delete “${editing.name}” from every category it is filed under? This cannot be undone.`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setConfirmDelete(false);
                    setInUse(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ force: Boolean(inUse) })}
                >
                  {inUse ? "Delete anyway" : "Delete"}
                </Button>
              </div>
            </div>
          ))}
      </div>
    </Sheet>
  );
}
