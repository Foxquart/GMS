"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Package, Coins, Boxes } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Field, Textarea, CircleButton, SectionHeader } from "@/components/ui";
import { AnimatedDropdown } from "@/components/animated-dropdown";
import { cn } from "@/lib/cn";

export default function NewPartPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [minimumShopStock, setMinimumShopStock] = useState("5");
  const [minimumWarehouseStock, setMinimumWarehouseStock] = useState("10");
  const [unit, setUnit] = useState("pcs");
  const [description, setDescription] = useState("");
  const [showMore, setShowMore] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<any[]>("/api/categories"),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/api/parts", {
        method: "POST",
        body: JSON.stringify({
          name,
          partNumber: partNumber || undefined,
          brand: brand || undefined,
          categoryId: categoryId || undefined,
          sellingPrice: sellingPrice || undefined,
          purchasePrice: purchasePrice || undefined,
          minimumShopStock: Number(minimumShopStock),
          minimumWarehouseStock: Number(minimumWarehouseStock),
          unit: unit || undefined,
          description: description || undefined,
        }),
      }),
    onSuccess: (p: any) => {
      toast.success(`${name.trim()} added to inventory`);
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.push(`/inventory/parts/${p.id}`);
    },
    onError: (e: any) => toast.error(e.message),
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
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return toast.error("Part name is required");
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
                  onChange={setCategoryId}
                  placeholder="Pick a category"
                />
              </Field>
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
          <SectionHeader
            title="Stock levels"
            icon={<Boxes size={16} />}
            action={
              <span className="tile-label text-[var(--ink-label)]">Warn me below</span>
            }
          />
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

        <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
          {create.isPending ? "Adding part…" : "Add part"}
        </Button>
      </form>
    </div>
  );
}
