"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Field, Textarea, Select, Card } from "@/components/ui";

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

      <Card className="space-y-4 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name) return toast.error("Part name is required");
            create.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Name *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brake Pad" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Part Number">
              <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="e.g. BP-100" />
            </Field>
            <Field label="Brand">
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. BOSCH" />
            </Field>
          </div>
          <Field label="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Selling Price (₹)">
              <Input type="number" min={0} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Purchase Price (₹)">
              <Input type="number" min={0} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Min Shop Stock">
              <Input type="number" min={0} value={minimumShopStock} onChange={(e) => setMinimumShopStock(e.target.value)} />
            </Field>
            <Field label="Min Warehouse">
              <Input type="number" min={0} value={minimumWarehouseStock} onChange={(e) => setMinimumWarehouseStock(e.target.value)} />
            </Field>
            <Field label="Unit">
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </Field>
          </div>
          <Field label="Description (optional)">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create Part"}
          </Button>
        </form>
      </Card>
    </div>
  );
}