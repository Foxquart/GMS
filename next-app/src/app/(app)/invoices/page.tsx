"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Search, Wrench, X } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  StatTile,
  StickyControls,
} from "@/components/ui";
import { SpotClipboard } from "@/components/illustrations";
import { currency, formatDate, invoiceStatusLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────────
   Invoice book.

   One row shape throughout: number and customer left (min-w-0, truncating),
   total and status right (shrink-0, tabular). The status pill lives in its
   own shrink-0 column so "Partially paid" can never wrap out of its shape.
   ───────────────────────────────────────────────────────────────────── */

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  total: string;
  paidAmount: string;
  dueAmount: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
};

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "ISSUED", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Part paid" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

/** PAID reads forest, credit reads ochre/terracotta, cancelled falls away. */
const statusColor = (
  status: InvoiceRow["status"],
  due: number,
): React.ComponentProps<typeof Badge>["color"] => {
  if (status === "PAID") return "green";
  if (status === "CANCELLED") return "gray";
  if (status === "PARTIALLY_PAID") return "amber";
  return due > 0 ? "red" : "slate";
};

function InvoiceRowCard({ invoice }: { invoice: InvoiceRow }) {
  const due = Number(invoice.dueAmount ?? 0);
  const owed = due > 0 && invoice.status !== "CANCELLED";

  return (
    <Link
      href={`/invoices/${invoice.id}`}
      className="block rounded-[var(--r-tile)]"
      aria-label={`Invoice ${invoice.invoiceNumber} for ${invoice.customerName}, ${currency(invoice.total)}`}
    >
      <article
        className={cn(
          "flex items-center gap-3 rounded-[var(--r-tile)] border bg-[var(--surface-bright)] p-3.5",
          "transition-[background-color,border-color,translate] duration-150 ease-out",
          "hover:-translate-y-px hover:bg-[var(--surface)] active:translate-y-0",
          owed
            ? "border-[var(--terracotta)]/25 hover:border-[var(--terracotta)]/45"
            : "border-[var(--hairline)] hover:border-[var(--hairline-strong)]",
          invoice.status === "CANCELLED" && "opacity-70",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="tabular truncate text-sm font-extrabold text-[var(--ink)]">
            {invoice.invoiceNumber}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
            {invoice.customerName} · {formatDate(invoice.createdAt)}
          </p>
          {owed && (
            <p className="tabular mt-0.5 truncate text-xs font-bold text-[var(--terracotta-hover)]">
              {currency(due)} still due
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="tabular text-sm font-extrabold text-[var(--ink)]">
            {currency(invoice.total)}
          </span>
          <Badge color={statusColor(invoice.status, due)} dot>
            {invoiceStatusLabel(invoice.status)}
          </Badge>
        </div>
      </article>
    </Link>
  );
}

export default function InvoicesPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterValue>("ALL");

  const { data: invoices, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["invoices", status, search],
    queryFn: () =>
      api<InvoiceRow[]>("/api/invoices", {
        params: { status: status === "ALL" ? undefined : status, q: search || undefined },
      }),
  });

  const book = useMemo(() => {
    const rows = invoices ?? [];
    const owed = rows
      .filter((inv) => inv.status !== "CANCELLED")
      .reduce((sum, inv) => sum + Number(inv.dueAmount ?? 0), 0);
    const unpaid = rows.filter(
      (inv) => inv.status !== "CANCELLED" && Number(inv.dueAmount ?? 0) > 0,
    ).length;
    return { count: rows.length, owed, unpaid };
  }, [invoices]);

  const clearSearch = () => {
    setQ("");
    setSearch("");
  };

  return (
    <div className="space-y-5">
      {/* Pinned chrome: the billing title, the jobs link, search and the
          status chips - the two things you reach for while hunting an invoice.
          Title and chips are both short rows, so on a 360x640 phone this stays
          around a third of the viewport. The awaiting-payment tile reports on
          the list rather than filtering it, so it scrolls away with it. */}
      <StickyControls className="space-y-2.5">
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="tile-label text-[var(--ink-label)]">Billing</p>
            <h1 className="mt-1 text-[clamp(1.5rem,6vw,2rem)] font-extrabold leading-none tracking-tight text-[var(--ink)]">
              Invoices
            </h1>
          </div>
          <Link href="/jobs" className="shrink-0">
            <Button variant="outline">
              <Wrench size={16} /> Jobs
            </Button>
          </Link>
        </header>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
            placeholder="Search by invoice number or customer, then press Enter"
            aria-label="Search invoices by number or customer"
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

        {/* The chips bleed back out to the page gutter so the row can be
            swiped edge to edge; StickyControls' own padding is what they are
            escaping, which lands them exactly where they sat before. */}
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
          role="group"
          aria-label="Filter invoices by status"
        >
          {FILTERS.map((f) => {
            const active = status === f.value;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(f.value)}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3.5 text-xs font-bold",
                  "transition-[background-color,color,border-color,scale] duration-150 ease-out",
                  "active:scale-[0.97] cursor-pointer",
                  active
                    ? "bg-[var(--forest)] text-[var(--ink-on-dark)]"
                    : "border border-[var(--hairline-strong)] bg-[var(--surface-bright)] text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </StickyControls>

      {isLoading ? (
        <Skeleton className="h-[124px] rounded-[var(--r-tile)]" />
      ) : isError ? null : (
        <StatTile
          tone={book.owed > 0 ? "terracotta" : "forest"}
          label="Awaiting payment"
          value={<span className="tabular">{currency(book.owed)}</span>}
          icon={<IndianRupee size={18} />}
          footnote={
            book.owed > 0
              ? `${book.unpaid} of ${book.count} ${book.count === 1 ? "invoice" : "invoices"} still open`
              : `All ${book.count} ${book.count === 1 ? "invoice is" : "invoices are"} settled`
          }
        />
      )}

      {isLoading ? (
        <div className="space-y-2.5" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[78px]" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load the invoice book"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      ) : !invoices?.length ? (
        <EmptyState
          title={
            search
              ? `No invoice matches "${search}"`
              : status === "ALL"
                ? "No invoices raised yet"
                : `Nothing filed under "${FILTERS.find((f) => f.value === status)?.label}"`
          }
          description="Invoices are raised automatically the moment a job is marked complete."
          illustration={<SpotClipboard size={84} />}
          action={
            search || status !== "ALL" ? (
              <Button
                variant="outline"
                onClick={() => {
                  clearSearch();
                  setStatus("ALL");
                }}
              >
                Show all invoices
              </Button>
            ) : (
              <Link href="/jobs">
                <Button>
                  <Wrench size={16} /> Go to jobs
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2.5">
          {invoices.map((inv) => (
            <InvoiceRowCard key={inv.id} invoice={inv} />
          ))}
        </div>
      )}
    </div>
  );
}
