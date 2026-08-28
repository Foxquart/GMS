"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Car,
  Download,
  IndianRupee,
  MessageCircle,
  Plus,
  Receipt,
  User,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Badge,
  BentoGrid,
  Button,
  CircleButton,
  EmptyState,
  ErrorState,
  Field,
  HeroPanel,
  Input,
  ResultPanel,
  SectionHeader,
  Select,
  Sheet,
  Skeleton,
  SpecTile,
  Tile,
} from "@/components/ui";
import { SpotClipboard } from "@/components/illustrations";
import { cn } from "@/lib/cn";
import {
  currency,
  formatDate,
  invoiceStatusLabel,
  PAYMENT_METHODS,
  paymentMethodLabel,
  vehicleTypeLabel,
} from "@/lib/format";

/* ─────────────────────────────────────────────────────────────────────
   Invoice detail.

   Reads top to bottom like the paper it replaces: who and what, the line
   items, then the balance. Settling the balance is a terminal moment, so
   it gets a ResultPanel; a part payment is routine and gets a toast.
   ───────────────────────────────────────────────────────────────────── */

function InvoiceSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-[212px] rounded-[var(--r-panel)]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <Skeleton className="h-[240px] rounded-[var(--r-card)]" />
      <Skeleton className="h-[136px] rounded-[var(--r-tile)]" />
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  // Set when a payment clears the balance — the sheet then shows the
  // terminal ResultPanel instead of the form.
  const [settledWith, setSettledWith] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => api<any>(`/api/invoices/${id}`),
  });

  const share = useMutation({
    mutationFn: () => api<{ url: string | null }>(`/api/invoices/${id}/share`),
    onError: (e: any) => toast.error(e.message),
  });

  const shareWhatsApp = async () => {
    try {
      const { url } = await share.mutateAsync();
      if (!url) {
        toast.error("This invoice has been cancelled");
        return;
      }
      const digits = (customer?.phone ?? "").replace(/[^0-9]/g, "");
      const phone = digits.length === 10 ? `91${digits}` : digits;
      const message = `Hello ${customer?.name ?? ""}, your invoice ${invoice.invoiceNumber} for ${currency(invoice.total)} is ready. You can view or download it here: ${url}`;
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");
    } catch (err: any) {
      toast.error(err.message ?? "Could not create share link");
    }
  };

  const addPayment = useMutation({
    mutationFn: () =>
      api<{ paidAmount: number; dueAmount: number; status: string }>(
        `/api/invoices/${id}/payments`,
        {
          method: "POST",
          body: JSON.stringify({ amount: Number(amount), method }),
        },
      ),
    onSuccess: (result) => {
      const settled = result?.status === "PAID" || Number(result?.dueAmount ?? 0) <= 0;
      if (settled) {
        // Terminal outcome — the sheet stays open and reports it.
        setSettledWith(Number(result?.paidAmount ?? amount));
      } else {
        toast.success(`${currency(amount)} recorded`);
        setPayOpen(false);
      }
      setAmount("");
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadPdf = () => {
    window.open(`/api/invoices/${id}/pdf`, "_blank");
  };

  const openPaymentSheet = () => {
    setSettledWith(null);
    setAmount("");
    setPayOpen(true);
  };

  if (isLoading) return <InvoiceSkeleton />;

  if (isError) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[212px] rounded-[var(--r-panel)]" />
        <ErrorState
          title="Couldn't load this invoice"
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Invoice not found"
        description="This invoice may have been removed. Check the invoice book for the current record."
        illustration={<SpotClipboard size={84} />}
        action={
          <Link href="/invoices">
            <Button variant="outline">Back to invoices</Button>
          </Link>
        }
      />
    );
  }

  const { invoice, customer, vehicle, job, items, payments, business } = data;

  const due = Number(invoice.dueAmount ?? 0);
  const paid = Number(invoice.paidAmount ?? 0);
  const total = Number(invoice.total ?? 0);
  const owed = due > 0 && invoice.status !== "CANCELLED";
  const canPay = invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID";
  const paidShare = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <div className="space-y-5">
      <HeroPanel
        tone="forest"
        eyebrow={business?.businessName ?? "Invoice"}
        title={invoice.invoiceNumber}
        subtitle={`${customer?.name ?? "Customer"} · ${formatDate(invoice.createdAt)}`}
        leading={
          <CircleButton onClick={() => router.back()} aria-label="Back">
            <ArrowLeft size={18} />
          </CircleButton>
        }
        trailing={
          <>
            <CircleButton onClick={downloadPdf} aria-label="Download PDF" title="Download PDF">
              <Download size={18} />
            </CircleButton>
            <CircleButton
              onClick={shareWhatsApp}
              disabled={share.isPending}
              aria-label="Share on WhatsApp"
              title="Share on WhatsApp"
              className="disabled:opacity-45"
            >
              <MessageCircle size={18} />
            </CircleButton>
          </>
        }
      >
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-[var(--ink-on-dark)]/15 pt-4">
          <div className="min-w-0">
            <p className="tile-label text-[var(--ink-on-dark-muted)]">Invoice total</p>
            <p className="numeral tabular mt-1.5 text-[clamp(1.75rem,8vw,2.75rem)]">
              {currency(invoice.total)}
            </p>
          </div>
          <p className="tile-label shrink-0 text-[var(--ink-on-dark-muted)]">
            {invoiceStatusLabel(invoice.status)}
          </p>
        </div>
      </HeroPanel>

      <BentoGrid className="sm:grid-cols-4">
        <SpecTile
          tone="bright"
          icon={<User size={20} />}
          label="Customer"
          value={
            customer ? (
              <Link
                href={`/customers/${customer.id}`}
                className="flex flex-col items-center gap-0.5 transition-[color] duration-150 ease-out hover:text-[var(--terracotta-hover)]"
              >
                <span className="max-w-full truncate">{customer.name}</span>
                <span className="tile-label tabular text-[var(--ink-label)]">{customer.phone}</span>
              </Link>
            ) : (
              "—"
            )
          }
        />
        <SpecTile
          tone="cream"
          icon={<Car size={20} />}
          label="Vehicle"
          value={
            vehicle ? (
              <span className="flex flex-col items-center gap-0.5">
                <span className="max-w-full truncate">
                  {vehicle.vehicleName || vehicleTypeLabel(vehicle.vehicleType)}
                </span>
                {vehicle.registrationNumber && (
                  <span className="tile-label tabular text-[var(--ink-label)]">
                    {vehicle.registrationNumber}
                  </span>
                )}
              </span>
            ) : (
              "Not recorded"
            )
          }
        />
        <SpecTile
          tone="cream"
          icon={<Wrench size={20} />}
          label="Job"
          value={
            job ? (
              <Link
                href={`/jobs/${job.id}`}
                className="tabular transition-[color] duration-150 ease-out hover:text-[var(--terracotta-hover)]"
              >
                {job.jobNumber}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <SpecTile
          tone="bright"
          icon={<CalendarDays size={20} />}
          label="Issued"
          value={<span className="tabular">{formatDate(invoice.createdAt)}</span>}
        />
      </BentoGrid>

      <section>
        <SectionHeader
          title="Line items"
          icon={<Receipt size={16} className="text-[var(--ink-label)]" />}
          action={
            <span className="tile-label text-[var(--ink-label)]">
              {(items ?? []).length} {(items ?? []).length === 1 ? "item" : "items"}
            </span>
          }
        />
        <div className="overflow-hidden rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-bright)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--hairline)] bg-[var(--surface)] px-4 py-2.5">
            <span className="tile-label text-[var(--ink-label)]">Description</span>
            <span className="tile-label text-[var(--ink-label)]">Amount</span>
          </div>

          {!items?.length ? (
            <p className="px-4 py-6 text-center text-sm font-semibold text-[var(--ink-muted)]">
              This invoice has no line items.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              {(items as any[]).map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--ink)]">{it.description}</p>
                    <p className="tabular mt-0.5 truncate text-xs font-semibold text-[var(--ink-label)]">
                      {it.itemType === "part" ? "Part" : "Labour"} · {Number(it.quantity)} ×{" "}
                      {currency(it.unitPrice)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-sm font-extrabold text-[var(--ink)]">
                    {currency(it.totalPrice)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <dl className="space-y-1.5 border-t border-[var(--hairline)] bg-[var(--surface)] px-4 py-3.5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-semibold text-[var(--ink-muted)]">Subtotal</dt>
              <dd className="tabular font-bold text-[var(--ink)]">{currency(invoice.subtotal)}</dd>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex items-center justify-between gap-4">
                <dt className="font-semibold text-[var(--ink-muted)]">Discount</dt>
                <dd className="tabular font-bold text-[var(--terracotta-hover)]">
                  −{currency(invoice.discount)}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 border-t border-[var(--hairline)] pt-2">
              <dt className="text-base font-extrabold text-[var(--ink)]">Total</dt>
              <dd className="tabular text-base font-extrabold text-[var(--ink)]">
                {currency(invoice.total)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <Tile
        tone={owed ? "terracotta" : "forest"}
        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "tile-label",
              owed ? "text-[#fdf6f2]/75" : "text-[var(--ink-on-dark-muted)]",
            )}
          >
            {owed
              ? "Balance due"
              : invoice.status === "CANCELLED"
                ? "Invoice cancelled"
                : "Settled in full"}
          </p>
          <p className="numeral tabular mt-2 text-[clamp(1.75rem,8vw,2.75rem)]">
            {currency(owed ? due : total)}
          </p>
          <p
            className={cn(
              "mt-1.5 text-xs font-semibold",
              owed ? "text-[#fdf6f2]/75" : "text-[var(--ink-on-dark-muted)]",
            )}
          >
            <span className="tabular">{currency(paid)}</span> received of{" "}
            <span className="tabular">{currency(total)}</span>
          </p>
          {paid > 0 && paid < total && (
            <div
              className={cn(
                "mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full",
                owed ? "bg-[#fdf6f2]/25" : "bg-[var(--ink-on-dark)]/25",
              )}
              role="presentation"
            >
              <div className="h-full rounded-full bg-current" style={{ width: `${paidShare}%` }} />
            </div>
          )}
        </div>
        {canPay && (
          <Button variant="outline" size="lg" onClick={openPaymentSheet} className="shrink-0">
            <Plus size={18} /> Record payment
          </Button>
        )}
      </Tile>

      <section>
        <SectionHeader
          title="Payments"
          icon={<Banknote size={16} className="text-[var(--ink-label)]" />}
          action={
            payments?.length ? (
              <span className="tile-label text-[var(--ink-label)]">
                {payments.length} {payments.length === 1 ? "entry" : "entries"}
              </span>
            ) : undefined
          }
        />
        {!payments?.length ? (
          <div className="rounded-[var(--r-tile)] border border-dashed border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-5 text-center">
            <p className="text-sm font-bold text-[var(--ink)]">Nothing received yet</p>
            <p className="mt-1 text-xs font-semibold text-[var(--ink-muted)]">
              Payments you record against this invoice are listed here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {(payments as any[]).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--ink)]">
                    {paymentMethodLabel(p.paymentMethod)}
                  </p>
                  <p className="tabular mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                    {formatDate(p.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular text-sm font-extrabold text-[var(--forest)]">
                    {currency(p.amount)}
                  </span>
                  <Badge color="blue">RECEIVED</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={settledWith !== null ? "Invoice settled" : "Record payment"}
      >
        {settledWith !== null ? (
          <ResultPanel
            status="success"
            title="Balance cleared"
            description={`${currency(settledWith)} received against ${invoice.invoiceNumber}. ${customer?.name ?? "This customer"} owes nothing on this invoice.`}
            primaryAction={
              <Button className="w-full sm:w-auto" onClick={() => setPayOpen(false)}>
                Back to invoice
              </Button>
            }
            secondaryAction={
              <Button variant="outline" className="w-full sm:w-auto" onClick={downloadPdf}>
                <Download size={16} /> Download PDF
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-[var(--r-control)] bg-[var(--surface-sunk)] px-4 py-3">
              <span className="tile-label text-[var(--ink-label)]">Outstanding</span>
              <span className="tabular text-base font-extrabold text-[var(--terracotta-hover)]">
                {currency(invoice.dueAmount)}
              </span>
            </div>

            <Field label="Amount (₹) *">
              <Input
                type="number"
                min={1}
                max={due}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                autoFocus
              />
            </Field>

            <button
              type="button"
              onClick={() => setAmount(String(due))}
              className={cn(
                "inline-flex h-8 items-center rounded-full border border-[var(--hairline-strong)] px-3.5",
                "bg-[var(--surface-bright)] text-xs font-bold text-[var(--ink-muted)]",
                "transition-[background-color,color,scale] duration-150 ease-out",
                "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)] active:scale-[0.97] cursor-pointer",
              )}
            >
              <IndianRupee size={13} className="mr-1" /> Pay the full {currency(due)}
            </button>

            <Field label="Payment method">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabel(m)}
                  </option>
                ))}
              </Select>
            </Field>

            <Button
              size="lg"
              className="w-full"
              onClick={() => addPayment.mutate()}
              disabled={!amount || Number(amount) < 1 || addPayment.isPending}
            >
              {addPayment.isPending ? "Saving payment…" : "Save payment"}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
