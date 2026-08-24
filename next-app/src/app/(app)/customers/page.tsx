"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Plus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Card, EmptyState, Skeleton, Sheet, Badge, ErrorState } from "@/components/ui";
import { currency } from "@/lib/format";

export default function CustomersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const { data: customers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["customers", search],
    queryFn: () => api<any[]>("/api/customers", { params: { q: search || undefined } }),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name, phone, address: address || undefined }),
      }),
    onSuccess: () => {
      toast.success("Customer created");
      setOpen(false);
      setName("");
      setPhone("");
      setAddress("");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-[#e2e8f0]/50 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Customer Registry</h1>
          <p className="text-xs font-semibold text-[#64748b]">Customer profiles & accounts</p>
        </div>
        <Button onClick={() => setOpen(true)} className="font-bold">
          <Plus size={16} /> New Customer
        </Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3 text-[#94a3b8]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
          placeholder="Search by name or phone…"
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : !customers?.length ? (
        <EmptyState
          title="No customers found"
          description="Add your first customer to get started."
          icon={<Users size={36} className="text-[#94a3b8]" />}
          action={
            <Button onClick={() => setOpen(true)} className="font-bold">
              <Plus size={16} /> New Customer
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`}>
              <Card className="flex items-center justify-between p-4 mt-2 transition-all duration-150 hover:bg-[#f1f5f9]/90 hover:border-[#5865f2]/50 hover:-translate-y-0.5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5865f2]/15 text-[#5865f2] border border-[#5865f2]/30 font-bold">
                    {c.name ? c.name[0].toUpperCase() : <Users size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0f172a]">{c.name}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{c.phone}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#64748b]">{c.totalJobs} jobs</p>
                    {Number(c.outstanding) > 0 ? (
                      <p className="text-xs font-extrabold text-[#b45309]">{currency(c.outstanding)} due</p>
                    ) : (
                      <p className="text-xs font-bold text-[#15803d]">Clear</p>
                    )}
                  </div>
                  <Badge color={Number(c.outstanding) > 0 ? "amber" : "green"} dot>
                    {Number(c.outstanding) > 0 ? "DUE" : "CLEARED"}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Add New Customer">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Full Name *</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Das" />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Phone Number *</span>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Address (optional)</span>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter street address" />
          </div>
          <Button className="w-full h-11 font-bold" onClick={() => create.mutate()} disabled={!name || !phone || create.isPending}>
            {create.isPending ? "Creating..." : "Create Customer"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}