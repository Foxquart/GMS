"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Field, Textarea, Select, Card } from "@/components/ui";
import { AnimatedDropdown } from "@/components/animated-dropdown";

export default function NewPartPage() {
  const router = useRouter();
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
      toast.success("Part created");
      router.push(`/inventory/parts/${p.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">New Part</h1>
      </div>

      <Card className="space-y-4 p-5 sm:p-6 shadow-sm border border-[#e2e8f0]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return toast.error("Part name is required");
            create.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Part Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brake Pad / Oil Filter"
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Part Number">
              <Input
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g. BP-100-X"
              />
            </Field>
            <Field label="Brand / Manufacturer">
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. BOSCH / Castrol"
              />
            </Field>
          </div>

          <Field label="Category">
            <AnimatedDropdown
              options={categories ?? []}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select a category (optional)..."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Selling Price (₹)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Purchase Price (₹)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Field label="Min Shop Stock">
              <Input
                type="number"
                min={0}
                value={minimumShopStock}
                onChange={(e) => setMinimumShopStock(e.target.value)}
                placeholder="5"
              />
            </Field>
            <Field label="Min Warehouse Stock">
              <Input
                type="number"
                min={0}
                value={minimumWarehouseStock}
                onChange={(e) => setMinimumWarehouseStock(e.target.value)}
                placeholder="10"
              />
            </Field>
            <Field label="Unit">
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. pcs / set"
              />
            </Field>
          </div>

          <Field label="Description (optional)">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add part specifications, compatibility notes, or details..."
              rows={3}
            />
          </Field>

          <Button type="submit" className="w-full h-11 font-bold text-base" disabled={create.isPending}>
            {create.isPending ? "Creating Part..." : "Create Part"}
          </Button>
        </form>
      </Card>
    </div>
  );
}