"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, Plus, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Select, Card, Badge, Skeleton, EmptyState, ErrorState, Sheet } from "@/components/ui";
import { currency, formatDate, vehicleTypeLabel, PAYMENT_METHODS, paymentMethodLabel, invoiceStatusLabel } from "@/lib/format";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");

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
      api(`/api/invoices/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), method }),
      }),
    onSuccess: () => {
      toast.success("Payment recorded");
      setPayOpen(false);
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data) return <EmptyState title="Invoice not found" />;

  const { invoice, customer, vehicle, job, items, payments, business } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-slate-500">{business?.businessName} · {formatDate(invoice.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadPdf}>
            <Download size={16} /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={shareWhatsApp}
            disabled={share.isPending}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <MessageCircle size={16} /> WhatsApp
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Bill To</p>
            <p className="text-sm font-semibold text-slate-900">{customer?.name}</p>
            <p className="text-xs text-slate-500">{customer?.phone}</p>
            {vehicle && (
              <p className="text-xs text-slate-500">
                {vehicleTypeLabel(vehicle.vehicleType)}
                {vehicle.vehicleName ? ` · ${vehicle.vehicleName}` : ""}
              </p>
            )}
          </div>
          <Badge color={invoice.status === "PAID" ? "green" : invoice.status === "PARTIALLY_PAID" ? "amber" : invoice.status === "CANCELLED" ? "red" : "slate"}>
            {invoiceStatusLabel(invoice.status)}
          </Badge>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <div className="mb-2 flex justify-between text-xs font-medium text-slate-400">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <div className="space-y-1.5">
            {(items ?? []).map((it: any) => (
              <div key={it.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {it.description}
                  {Number(it.quantity) > 1 ? <span className="text-xs text-slate-400"> × {it.quantity}</span> : null}
                </span>
                <span className="font-medium text-slate-900">{currency(it.totalPrice)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{currency(invoice.subtotal)}</span>
          </div>
          {Number(invoice.discount) > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Discount</span>
              <span>-{currency(invoice.discount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{currency(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Paid</span>
            <span>{currency(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-amber-600">
            <span>Due</span>
            <span>{currency(invoice.dueAmount)}</span>
          </div>
        </div>
      </Card>

      {(invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID") && (
        <Button className="w-full" size="lg" onClick={() => setPayOpen(true)}>
          <Plus size={18} /> Record Payment
        </Button>
      )}

      {payments?.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-base font-bold text-slate-900">Payments</h2>
          <div className="space-y-1.5">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">
                  {formatDate(p.createdAt)} · {paymentMethodLabel(p.paymentMethod)}
                </span>
                <span className="font-semibold text-emerald-600">{currency(p.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {job && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <FileText size={14} /> Job {job.jobNumber}
        </div>
      )}

      <Sheet open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment">
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs">
            <span className="text-[#64748b]">Outstanding Due: </span>
            <span className="font-bold text-[#b45309] text-sm">{currency(invoice.dueAmount)}</span>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">Amount (₹) *</span>
            <Input
              type="number"
              min={1}
              max={Number(invoice.dueAmount)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">Payment Method</span>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel(m)}
                </option>
              ))}
            </Select>
          </div>
          <Button
            className="w-full h-11 font-bold text-base"
            onClick={() => addPayment.mutate()}
            disabled={!amount || Number(amount) < 1 || addPayment.isPending}
          >
            {addPayment.isPending ? "Saving Payment..." : "Save Payment"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}