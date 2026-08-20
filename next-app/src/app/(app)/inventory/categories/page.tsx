"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Package } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Card, EmptyState, Skeleton, Sheet, Badge, ErrorState } from "@/components/ui";

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: categories, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<any[]>("/api/categories"),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined }),
      }),
    onSuccess: () => {
      toast.success("Category created");
      setOpen(false);
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: (id: string) =>
      api("/api/categories", { method: "PATCH", body: JSON.stringify({ id, isArchived: true }) }),
    onSuccess: () => {
      toast.success("Category archived");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Organize your parts</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
) : isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : !categories?.length ? (
          <EmptyState title="No categories yet" description="Create your first category." />
        ) : (
        <div className="space-y-2">
          {categories.map((c) => (
            <Card key={c.id} className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Package size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  {c.description && <p className="text-xs text-slate-500">{c.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.isArchived && <Badge color="gray">Archived</Badge>}
                {!c.isArchived && (
                  <button
                    onClick={() => archive.mutate(c.id)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    Archive
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="New Category">
        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Name *</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brake System" />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Description (optional)</span>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={!name || create.isPending}>
            Create Category
          </Button>
        </div>
      </Sheet>
    </div>
  );
}