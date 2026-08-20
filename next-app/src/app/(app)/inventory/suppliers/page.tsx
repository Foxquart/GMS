"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Textarea, Card, EmptyState, Skeleton, Sheet, ErrorState } from "@/components/ui";

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { data: suppliers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api<any[]>("/api/suppliers"),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/api/suppliers", {
        method: "POST",
        body: JSON.stringify({ name, phone: phone || undefined, address: address || undefined, notes: notes || undefined }),
      }),
    onSuccess: () => {
      toast.success("Supplier added");
      setOpen(false);
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">Where your stock comes from</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
) : isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : !suppliers?.length ? (
          <EmptyState title="No suppliers yet" description="Add suppliers for your purchases." />
        ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 p-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Truck size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-500">{s.phone || "No phone"} {s.address ? `· ${s.address}` : ""}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="New Supplier">
        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Name *</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ABC Auto Parts" />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={!name || create.isPending}>
            Add Supplier
          </Button>
        </div>
      </Sheet>
    </div>
  );
}