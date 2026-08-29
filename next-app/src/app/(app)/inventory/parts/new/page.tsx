"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Package, Coins, Boxes, Plus, Trash2 } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  Button,
  CircleButton,
  Field,
  InlineError,
  Input,
  SectionHeader,
  Textarea,
} from "@/components/ui";
import { AnimatedDropdown } from "@/components/animated-dropdown";
import { REFERENCE_QUERY } from "@/lib/query-keys";
import { cn } from "@/lib/cn";

export default function NewPartPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [minimumShopStock, setMinimumShopStock] = useState("5");
  const [minimumWarehouseStock, setMinimumWarehouseStock] = useState("10");
  const [openingShopStock, setOpeningShopStock] = useState("0");
  const [openingWarehouseStock, setOpeningWarehouseStock] = useState("0");
  const [unit, setUnit] = useState("pcs");
  const [description, setDescription] = useState("");
  const [showMore, setShowMore] = useState(false);
  // Open-ended spec sheet — a workshop tracks different things per part.
  const [attributes, setAttributes] = useState<{ label: string; value: string }[]>([]);
  const [formError, setFormError] = useState<{ message: string; reference?: string } | null>(null);

  // Any edit anywhere in the form answers the last failure, so it is cleared
  // from the form's own onChange rather than from a dozen field handlers.
  const clearFormError = () => setFormError((prev) => (prev ? null : prev));

  const setAttribute = (i: number, patch: Partial<{ label: string; value: string }>) =>
    setAttributes((rows) => rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const addAttribute = () =>
    setAttributes((rows) => [...rows, { label: "", value: "" }]);
  const removeAttribute = (i: number) =>
    setAttributes((rows) => rows.filter((_, n) => n !== i));

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<any[]>("/api/categories"),
    ...REFERENCE_QUERY,
  });

  // A sub-category only means anything inside a category, so this waits for
  // one to be picked and then asks which sub-categories that category carries.
  const { data: subCategories, isFetching: subCategoriesLoading } = useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: () => api<any[]>("/api/subcategories", { params: { categoryId } }),
    enabled: Boolean(categoryId),
    ...REFERENCE_QUERY,
  });

  // Changing the category invalidates whatever sub-category was chosen — the
  // server rejects a pair that is not linked, so clearing it here is the same
  // rule stated earlier.
  const pickCategory = (id: string) => {
    setCategoryId(id);
    setSubCategoryId("");
  };

  const create = useMutation({
    mutationFn: () =>
      api("/api/parts", {
        method: "POST",
        body: JSON.stringify({
          name,
          partNumber: partNumber || undefined,
          brand: brand || undefined,
          categoryId: categoryId || undefined,
          subCategoryId: subCategoryId || undefined,
          sellingPrice: sellingPrice || undefined,
          purchasePrice: purchasePrice || undefined,
          minimumShopStock: Number(minimumShopStock),
          minimumWarehouseStock: Number(minimumWarehouseStock),
          unit: unit || undefined,
          description: description || undefined,
          attributes: attributes.filter((a) => a.label.trim() || a.value.trim()),
          openingShopStock: Number(openingShopStock || 0),
          openingWarehouseStock: Number(openingWarehouseStock || 0),
        }),
      }),
    onSuccess: (p: any) => {
      toast.success(`${name.trim()} added to inventory`);
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.push(`/inventory/parts/${p.id}`);
    },
    // The form the person filled in is still on screen. The error belongs
    // beside the button they pressed, not in a toast that slides away with
    // everything they typed still unsaved.
    onError: (err) =>
      setFormError({ message: errorMessage(err), reference: errorReference(err) }),
  });

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <CircleButton onDark={false} onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={18} />
        </CircleButton>
        <div className="min-w-0">
          <p className="tile-label text-[var(--ink-label)]">Inventory</p>
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-[var(--ink)]">
            New part
          </h1>
        </div>
      </div>

      <form
        onChange={clearFormError}
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setFormError({ message: "Give the part a name before saving it." });
            return;
          }
          setFormError(null);
          create.mutate();
        }}
        className="space-y-5"
      >
        <section className="rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4 sm:p-5">
          <SectionHeader title="What is it?" icon={<Package size={16} />} />
          <div className="space-y-3.5">
            <Field label="Part name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Front brake pad set"
                required
              />
            </Field>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Brand">
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Bosch"
                />
              </Field>
              <Field label="Category">
                <AnimatedDropdown
                  options={categories ?? []}
                  value={categoryId}
                  onChange={pickCategory}
                  placeholder="Pick a category"
                />
              </Field>
            </div>

            <Field
              label="Sub-category"
              hint={
                !categoryId
                  ? "Pick a category first — sub-categories are listed inside one."
                  : undefined
              }
            >
              <AnimatedDropdown
                options={subCategories ?? []}
                value={subCategoryId}
                onChange={setSubCategoryId}
                disabled={!categoryId || subCategoriesLoading}
                showClearOption
                clearLabel="No sub-category"
                placeholder={
                  !categoryId
                    ? "Pick a category first"
                    : subCategoriesLoading
                      ? "Loading…"
                      : subCategories?.length
                        ? "Optional"
                        : "None in this category yet"
                }
              />
            </Field>

            <div className="border-t border-[var(--hairline)] pt-3.5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="tile-label text-[var(--ink-label)]">Custom fields</span>
                <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
                  <Plus size={14} /> Add field
                </Button>
              </div>
              {!attributes.length ? (
                <p className="text-xs text-[var(--ink-muted)]">
                  Add your own spec rows — thread pitch, viscosity, fitment, warranty.
                </p>
              ) : (
                <div className="space-y-2">
                  {attributes.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={row.label}
                        onChange={(e) => setAttribute(i, { label: e.target.value })}
                        placeholder="Field"
                        className="flex-1"
                        aria-label={`Custom field ${i + 1} name`}
                      />
                      <Input
                        value={row.value}
                        onChange={(e) => setAttribute(i, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1"
                        aria-label={`Custom field ${i + 1} value`}
                      />
                      <CircleButton
                        type="button"
                        onDark={false}
                        onClick={() => removeAttribute(i)}
                        aria-label={`Remove custom field ${i + 1}`}
                        className="h-9 w-9 shrink-0"
                      >
                        <Trash2 size={15} />
                      </CircleButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        </section>

        <section className="rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4 sm:p-5">
          <SectionHeader title="Price" icon={<Coins size={16} />} />
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Selling price (₹)">
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="tabular"
              />
            </Field>
            <Field label="Purchase price (₹)">
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="tabular"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4 sm:p-5">
          <SectionHeader title="Stock" icon={<Boxes size={16} />} />

          <p className="mb-2 text-xs font-semibold text-[var(--ink-muted)]">
            How many you have right now. Recorded as opening stock — you do not
            need to run Stock In afterwards.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="In shop">
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={openingShopStock}
                onChange={(e) => setOpeningShopStock(e.target.value)}
                placeholder="0"
                className="tabular"
              />
            </Field>
            <Field label="In warehouse">
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={openingWarehouseStock}
                onChange={(e) => setOpeningWarehouseStock(e.target.value)}
                placeholder="0"
                className="tabular"
              />
            </Field>
          </div>

          <p className="mb-2 mt-4 border-t border-[var(--hairline)] pt-3 text-xs font-semibold text-[var(--ink-muted)]">
            Warn me when stock falls below these levels.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Min shop">
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={minimumShopStock}
                onChange={(e) => setMinimumShopStock(e.target.value)}
                placeholder="5"
                className="tabular"
              />
            </Field>
            <Field label="Min w/house">
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={minimumWarehouseStock}
                onChange={(e) => setMinimumWarehouseStock(e.target.value)}
                placeholder="10"
                className="tabular"
              />
            </Field>
            <Field label="Unit">
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs" />
            </Field>
          </div>

          <div className="mt-4 border-t border-[var(--hairline)] pt-3">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              aria-expanded={showMore}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-full px-3 py-2 text-xs font-extrabold",
                "text-[var(--ink-muted)] transition-[background-color,color] duration-150 ease-out",
                "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
              )}
            >
              <span>{showMore ? "Hide part number and notes" : "Part number and notes"}</span>
              <ChevronDown
                size={15}
                className={cn(
                  "transition-transform duration-200 ease-out",
                  showMore && "rotate-180",
                )}
              />
            </button>
            {showMore && (
              <div className="mt-3 space-y-3.5">
                <Field label="Part number">
                  <Input
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="BP-100-X"
                  />
                </Field>
                <Field label="Description" hint="Fitment notes, specs, anything the counter needs.">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Fits 2015–2020 hatchbacks. Sold as a pair."
                    rows={3}
                  />
                </Field>

              </div>
            )}
          </div>
        </section>


        {/* Deliberately not a pinned bottom bar. The failure from the last
            attempt has to be beside the button that caused it, and pinning
            the button would leave that error scrolled away up the form; a
            second floating bar would also stack over the global nav pill and
            fight the on-screen keyboard while the fields are being typed
            into. The form is three short sections with the rarely-needed
            fields already collapsed — reaching the end is the task ending. */}
        {formError && (
          <InlineError message={formError.message} reference={formError.reference} />
        )}

        <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
          {create.isPending ? "Adding part…" : "Add part"}
        </Button>
      </form>
    </div>
  );
}
