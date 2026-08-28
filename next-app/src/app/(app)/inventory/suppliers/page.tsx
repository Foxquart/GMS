"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Truck, ArrowLeft, Phone, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  SectionHeader,
  Sheet,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { SpotOilCan } from "@/components/illustrations";
import { cn } from "@/lib/cn";

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { data: suppliers, isPending, isError, error, refetch } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api<any[]>("/api/suppliers"),
  });

  const create = useMutation({
    mutationFn: () =>
      api("/api/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          address: address || undefined,
          notes: notes || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success(`${name.trim()} added to suppliers`);
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
              Suppliers
            </h1>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">
          <Plus size={16} /> New
        </Button>
      </div>

      <section>
        <SectionHeader
          title="Where stock comes from"
          icon={<Truck size={16} />}
          action={
            suppliers ? (
              <span className="tile-label text-[var(--ink-label)]">{suppliers.length} listed</span>
            ) : null
          }
        />

        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px]" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            message={(error as Error)?.message ?? "The supplier list didn't load."}
            onRetry={() => refetch()}
          />
        ) : !suppliers?.length ? (
          <EmptyState
            illustration={<SpotOilCan size={84} />}
            title="No suppliers yet"
            description="Add the shops and distributors you buy from, then pick one when you record a stock-in."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} /> New supplier
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {suppliers.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5"
              >
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-[var(--sage)] text-[var(--forest)]"
                >
                  <Truck size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[var(--ink)]">{s.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                    {s.phone ? (
                      <>
                        <Phone size={12} className="shrink-0" />
                        <span className="tabular">{s.phone}</span>
                      </>
                    ) : (
                      <span>No phone on file</span>
                    )}
                    {s.address && (
                      <>
                        <MapPin size={12} className="ml-1 shrink-0" />
                        <span className="truncate">{s.address}</span>
                      </>
                    )}
                  </p>
                </div>
                {s.phone && (
                  <a
                    href={`tel:${s.phone}`}
                    aria-label={`Call ${s.name}`}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      "bg-[var(--surface-sunk)] text-[var(--ink)]",
                      "transition-[background-color,transform] duration-150 ease-out",
                      "hover:bg-[var(--hairline)] active:scale-90",
                    )}
                  >
                    <Phone size={15} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={open} onClose={() => setOpen(false)} title="New supplier">
        <div className="space-y-3.5">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sharma Auto Spares"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="98765 43210"
              className="tabular"
            />
          </Field>
          <Field label="Address">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop 14, Ring Road Market"
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Delivers on Tuesdays. Credit terms 15 days."
            />
          </Field>
          <Button
            className="w-full"
            size="lg"
            onClick={() => create.mutate()}
            disabled={!name || create.isPending}
          >
            {create.isPending ? "Adding supplier…" : "Add supplier"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
