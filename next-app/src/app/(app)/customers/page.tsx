"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IndianRupee, Plus, Search, User, X } from "lucide-react";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Skeleton,
  StatTile,
  Sheet,
} from "@/components/ui";
import { SpotTools } from "@/components/illustrations";
import { currency } from "@/lib/format";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────────
   Customer registry.

   The whole job of this page is "who owes me money". Outstanding rows are
   terracotta and lead with the amount; settled rows are sage and lead with
   a badge. Every row is the same two-column shape: identity left (min-w-0,
   truncating), money/status right (shrink-0, tabular) — so nothing collides.
   ───────────────────────────────────────────────────────────────────── */

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  totalJobs: number | string;
  outstanding: string | number;
};

const jobsLabel = (n: number) => `${n} ${n === 1 ? "job" : "jobs"}`;

function RegistryRow({ customer }: { customer: CustomerRow }) {
  const due = Number(customer.outstanding ?? 0);
  const owes = due > 0;
  const initial = customer.name?.trim()?.[0]?.toUpperCase();

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block rounded-[var(--r-tile)]"
      aria-label={`${customer.name} — ${owes ? `${currency(due)} due` : "account cleared"}`}
    >
      <article
        className={cn(
          "flex items-center gap-3 rounded-[var(--r-tile)] border bg-[var(--surface-bright)] p-3.5",
          "transition-[background-color,border-color,translate] duration-150 ease-out",
          "hover:-translate-y-px hover:bg-[var(--surface)] active:translate-y-0",
          owes
            ? "border-[var(--terracotta)]/25 hover:border-[var(--terracotta)]/45"
            : "border-[var(--hairline)] hover:border-[var(--hairline-strong)]",
        )}
      >
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-control)] text-base font-extrabold",
            owes
              ? "bg-[var(--terracotta)]/14 text-[var(--terracotta-hover)]"
              : "bg-[var(--sage)] text-[var(--forest)]",
          )}
          aria-hidden="true"
        >
          {initial ?? <User size={18} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-[var(--ink)]">{customer.name}</p>
          <p className="tabular mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
            {customer.phone}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {owes ? (
            <span className="tabular text-sm font-extrabold text-[var(--terracotta-hover)]">
              {currency(due)}
            </span>
          ) : (
            <Badge color="blue" dot>
              CLEARED
            </Badge>
          )}
          <span className="tile-label text-[var(--ink-label)]">
            {jobsLabel(Number(customer.totalJobs ?? 0))}
            {owes ? " · due" : ""}
          </span>
        </div>
      </article>
    </Link>
  );
}

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
    queryFn: () => api<CustomerRow[]>("/api/customers", { params: { q: search || undefined } }),
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

  const ledger = useMemo(() => {
    const rows = customers ?? [];
    const owing = rows.filter((c) => Number(c.outstanding ?? 0) > 0);
    return {
      total: rows.length,
      owingCount: owing.length,
      owed: owing.reduce((sum, c) => sum + Number(c.outstanding ?? 0), 0),
    };
  }, [customers]);

  const clearSearch = () => {
    setQ("");
    setSearch("");
  };

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="tile-label text-[var(--ink-label)]">Registry</p>
          <h1 className="mt-1 text-[clamp(1.5rem,6vw,2rem)] font-extrabold leading-none tracking-tight text-[var(--ink)]">
            Customers
          </h1>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New customer
        </Button>
      </header>

      {isLoading ? (
        <Skeleton className="h-[124px] rounded-[var(--r-tile)]" />
      ) : isError ? null : (
        <StatTile
          tone={ledger.owed > 0 ? "terracotta" : "forest"}
          label={search ? "Owed by these customers" : "Owed to the workshop"}
          value={<span className="tabular">{currency(ledger.owed)}</span>}
          icon={<IndianRupee size={18} />}
          footnote={
            ledger.owed > 0
              ? `${ledger.owingCount} of ${ledger.total} ${ledger.total === 1 ? "customer is" : "customers are"} on credit`
              : `Every one of the ${ledger.total} ${ledger.total === 1 ? "account" : "accounts"} is settled`
          }
        />
      )}

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
          placeholder="Search by name or phone, then press Enter"
          aria-label="Search customers by name or phone"
          className={cn("pl-11", q && "pr-11")}
        />
        {q && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className={cn(
              "absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full",
              "text-[var(--ink-label)] transition-[background-color,color,scale] duration-150 ease-out",
              "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)] active:scale-90 cursor-pointer",
            )}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2.5" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[70px]" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load your customers"
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      ) : !customers?.length ? (
        search ? (
          <EmptyState
            title={`No match for "${search}"`}
            description="Try just the last few digits of the phone number, or add them to the registry."
            illustration={<SpotTools size={84} />}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" onClick={clearSearch}>
                  Clear search
                </Button>
                <Button onClick={() => setOpen(true)}>
                  <Plus size={16} /> New customer
                </Button>
              </div>
            }
          />
        ) : (
          <EmptyState
            title="The registry is empty"
            description="Add your first customer — their vehicles, jobs, invoices and payments all hang off this record."
            illustration={<SpotTools size={84} />}
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} /> New customer
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-2.5">
          {customers.map((c) => (
            <RegistryRow key={c.id} customer={c} />
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="New customer">
        <div className="space-y-4">
          <Field label="Full name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rahul Das"
              autoComplete="name"
            />
          </Field>
          <Field label="Phone number *" hint="Used for calls, WhatsApp and invoice sharing.">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="98765 43210"
              autoComplete="tel"
            />
          </Field>
          <Field label="Address (optional)">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="12 Gandhi Road, Tezpur"
              autoComplete="street-address"
            />
          </Field>
          <Button
            size="lg"
            className="w-full"
            onClick={() => create.mutate()}
            disabled={!name || !phone || create.isPending}
          >
            {create.isPending ? "Saving…" : "Create customer"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
