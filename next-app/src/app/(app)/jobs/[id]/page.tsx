"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  MoveRight,
  Search,
  Check,
  Package,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  EmptyState,
  ErrorState,
  Skeleton,
  Sheet,
} from "@/components/ui";
import { currency, formatDate, jobStatusLabel, vehicleTypeLabel, PAYMENT_METHODS, paymentMethodLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api<any>(`/api/jobs/${id}`),
  });

  const [addPartOpen, setAddPartOpen] = useState(false);
  const [addLabourOpen, setAddLabourOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferPart, setTransferPart] = useState<any>(null);

  // add-part form
  const [partId, setPartId] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partSearch, setPartSearch] = useState("");
  // add-labour form
  const [labourDesc, setLabourDesc] = useState("");
  const [labourAmount, setLabourAmount] = useState("");
  // complete form
  const [discount, setDiscount] = useState("0");
  const [payType, setPayType] = useState("paid");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payAmount, setPayAmount] = useState("");

  const { data: parts } = useQuery({
    queryKey: ["parts"],
    queryFn: () => api<any[]>("/api/parts"),
  });

  const job = data?.job;
  const jobParts = data?.parts ?? [];
  const labour = data?.labour ?? [];
  const total = jobParts.reduce((s: number, p: any) => s + Number(p.totalPrice), 0) + labour.reduce((s: number, l: any) => s + Number(l.amount), 0);
  const completed = job?.status === "COMPLETED" || job?.status === "CANCELLED";

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["job", id] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
  };

  const addPart = useMutation({
    mutationFn: () =>
      api(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "add-part", partId, quantity: Number(partQty) }),
      }),
    onSuccess: () => {
      toast.success("Part added");
      setAddPartOpen(false);
      setPartId("");
      setPartQty("1");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removePart = useMutation({
    mutationFn: (jobPartId: string) =>
      api(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "remove-part", jobPartId }),
      }),
    onSuccess: () => {
      toast.success("Part removed");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addLabour = useMutation({
    mutationFn: () =>
      api(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "add-labour", description: labourDesc, amount: Number(labourAmount) }),
      }),
    onSuccess: () => {
      toast.success("Labour added");
      setAddLabourOpen(false);
      setLabourDesc("");
      setLabourAmount("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeLabour = useMutation({
    mutationFn: (labourId: string) =>
      api(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "remove-labour", labourId }),
      }),
    onSuccess: () => {
      toast.success("Labour removed");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const transfer = useMutation({
    mutationFn: (part: any) =>
      api("/api/inventory/transfers", {
        method: "POST",
        body: JSON.stringify({
          partId: part.partId,
          quantity: Math.max(1, part.required - part.shopStock),
          notes: `Auto transfer for JOB-${job?.jobNumber ?? ""}`,
        }),
      }),
    onSuccess: () => {
      toast.success("Stock moved from Warehouse to Shop");
      setTransferOpen(false);
      setTransferPart(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: () =>
      api(`/api/jobs/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          discount: Number(discount || 0),
          payment:
            payType === "paid"
              ? { amount: Number(payAmount || total), method: payMethod }
              : payType === "partial"
                ? { amount: Number(payAmount || 0), method: payMethod }
                : null,
        }),
      }),
    onSuccess: (res: any) => {
      toast.success("Job completed and invoiced");
      setCompleteOpen(false);
      invalidate();
      router.push(`/invoices/${res.invoice.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const moveToShop = (part: any) => {
    setTransferPart(part);
    setTransferOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 rounded-2xl" />
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

  if (!job) {
    return <EmptyState title="Job not found" description="This job may have been removed." />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{job.jobNumber}</h1>
          <p className="text-sm text-slate-500">
            {data.customer?.name} · {data.vehicle ? vehicleTypeLabel(data.vehicle.vehicleType) : "Vehicle"} · {formatDate(job.createdAt)}
          </p>
        </div>
        <Badge color={job.status === "COMPLETED" ? "green" : job.status === "CANCELLED" ? "red" : "blue"}>
          {jobStatusLabel(job.status)}
        </Badge>
      </div>

      <Card className="space-y-1 p-4">
        <p className="text-sm font-semibold text-slate-900">Complaint / Work</p>
        <p className="text-sm text-slate-600">{job.complaint || "No complaint noted"}</p>
        {job.workNotes && (
          <p className="text-sm text-slate-500 mt-1">{job.workNotes}</p>
        )}
        {data.vehicle && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {data.vehicle.vehicleName && <Badge>{data.vehicle.vehicleName}</Badge>}
            {data.vehicle.registrationNumber && <Badge>{data.vehicle.registrationNumber}</Badge>}
          </div>
        )}
      </Card>

      {/* Parts Used */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Parts Used</h2>
          {!completed && (
            <Button size="sm" variant="outline" onClick={() => setAddPartOpen(true)}>
              <Plus size={16} /> Add
            </Button>
          )}
        </div>
        {!jobParts.length ? (
          <p className="text-sm text-slate-500">No parts added yet.</p>
        ) : (
          <div className="space-y-2">
            {jobParts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{p.partName}</p>
                  <p className="text-xs text-slate-500">× {p.quantity} @ {currency(p.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{currency(p.totalPrice)}</span>
                  {!completed && (
                    <button
                      onClick={() => removePart.mutate(p.id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Labour */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Labour</h2>
          {!completed && (
            <Button size="sm" variant="outline" onClick={() => setAddLabourOpen(true)}>
              <Plus size={16} /> Add
            </Button>
          )}
        </div>
        {!labour.length ? (
          <p className="text-sm text-slate-500">No labour added yet.</p>
        ) : (
          <div className="space-y-2">
            {labour.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-900">{l.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{currency(l.amount)}</span>
                  {!completed && (
                    <button
                      onClick={() => removeLabour.mutate(l.id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Totals */}
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">{currency(total)}</p>
        </div>
        {!completed && (
          <Button size="lg" onClick={() => setCompleteOpen(true)}>
            <CheckCircle2 size={18} /> Complete Job
          </Button>
        )}
        {completed && job.status === "COMPLETED" && data.invoice && (
          <Button size="lg" variant="success" onClick={() => router.push(`/invoices/${data.invoice.id}`)}>
            View Invoice
          </Button>
        )}
      </Card>

      {/* Add part sheet */}
      <Sheet open={addPartOpen} onClose={() => setAddPartOpen(false)} title="Add Part to Job">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">Search & Select Part</span>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-3 text-[#94a3b8]" />
              <Input
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Search part by name or part number..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-[#e2e8f0] rounded-xl p-1.5 bg-[#f8fafc]">
              {!(parts ?? []).length ? (
                <p className="p-3 text-center text-xs text-[#94a3b8]">No parts available in inventory</p>
              ) : (
                (parts ?? [])
                  .filter((p: any) =>
                    !partSearch ||
                    p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
                    (p.partNumber && p.partNumber.toLowerCase().includes(partSearch.toLowerCase()))
                  )
                  .map((p: any) => {
                    const selected = partId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setPartId(p.id)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                          selected
                            ? "border-[#5865f2] bg-[#5865f2]/10 text-[#0f172a] font-bold ring-2 ring-[#5865f2]/30"
                            : "border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f1f5f9]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5865f2]/10 text-[#5865f2]">
                            <Package size={16} />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-xs text-[#0f172a] truncate">{p.name}</p>
                            <p className="text-[11px] text-[#64748b] truncate">
                              {p.partNumber ? `#${p.partNumber}` : "No Part No"} · {currency(p.sellingPrice || p.unitPrice || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge color={p.shopStock > 0 ? "green" : "gray"}>Shop: {p.shopStock}</Badge>
                          <Badge color={p.warehouseStock > 0 ? "blue" : "gray"}>W/house: {p.warehouseStock}</Badge>
                          {selected && <Check size={16} className="text-[#5865f2]" />}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {partId && (() => {
            const p = (parts ?? []).find((x: any) => x.id === partId);
            const qty = Number(partQty || 1);
            if (p && qty > p.shopStock && p.warehouseStock > 0) {
              return (
                <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                  Only {p.shopStock} available in Shop. Warehouse has {p.warehouseStock}.
                  <Button size="sm" className="mt-2 text-xs" onClick={() => moveToShop({ partId: p.id, required: qty, shopStock: p.shopStock })}>
                    <MoveRight size={14} /> Move {qty - p.shopStock} to Shop
                  </Button>
                </div>
              );
            }
            if (p && qty > p.shopStock) {
              return (
                <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  Only {p.shopStock} in Shop and {p.warehouseStock} in Warehouse. Stock is insufficient.
                </div>
              );
            }
            return null;
          })()}

          <div>
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#64748b]">Quantity</span>
            <Input
              type="number"
              min={1}
              value={partQty}
              onChange={(e) => setPartQty(e.target.value)}
            />
          </div>

          <Button className="w-full h-11 font-bold" onClick={() => addPart.mutate()} disabled={!partId || addPart.isPending}>
            {addPart.isPending ? "Adding..." : "Add to Job"}
          </Button>
        </div>
      </Sheet>

      {/* Add labour sheet */}
      <Sheet open={addLabourOpen} onClose={() => setAddLabourOpen(false)} title="Add Labour Charge">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">Description *</span>
            <Input
              value={labourDesc}
              onChange={(e) => setLabourDesc(e.target.value)}
              placeholder="e.g. Engine Tuning / Brake Service"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">Amount (₹) *</span>
            <Input
              type="number"
              value={labourAmount}
              onChange={(e) => setLabourAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <Button className="w-full h-11 font-bold" onClick={() => addLabour.mutate()} disabled={!labourDesc || !labourAmount || addLabour.isPending}>
            {addLabour.isPending ? "Adding..." : "Add Labour to Job"}
          </Button>
        </div>
      </Sheet>

      {/* Transfer sheet */}
      <Sheet open={transferOpen} onClose={() => setTransferOpen(false)} title="Move Stock to Shop">
        {transferPart && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-xs text-[#0f172a]">
              <p className="font-bold text-sm text-[#0f172a] mb-1">Part: {parts?.find((p: any) => p.id === transferPart.partId)?.name}</p>
              <p className="text-[#64748b]">
                Shop has <strong className="text-[#0f172a]">{transferPart.shopStock}</strong>, required <strong className="text-[#0f172a]">{transferPart.required}</strong>. Moving{" "}
                <strong className="text-[#5865f2]">{Math.max(1, transferPart.required - transferPart.shopStock)}</strong> unit(s) from Warehouse.
              </p>
            </div>
            <Button className="w-full h-11 font-bold" onClick={() => transfer.mutate(transferPart)} disabled={transfer.isPending}>
              <MoveRight size={16} /> Move Stock to Shop
            </Button>
            <Button variant="ghost" className="w-full font-bold" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
          </div>
        )}
      </Sheet>

      {/* Complete job sheet */}
      <Sheet open={completeOpen} onClose={() => setCompleteOpen(false)} title="Complete Job & Billing">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-[#64748b]">
              <span>Subtotal</span>
              <span className="font-bold text-[#0f172a]">{currency(total)}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
              <span>Discount (₹)</span>
              <Input
                type="number"
                className="h-8 w-24 text-right text-xs font-bold"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="flex justify-between border-t border-[#e2e8f0] pt-2 text-sm">
              <span className="font-bold text-[#0f172a]">Final Total</span>
              <span className="font-black text-[#5865f2] text-lg">{currency(Math.max(0, total - Number(discount || 0)))}</span>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">Payment Type</span>
            <div className="relative flex rounded-xl bg-[#f1f5f9] p-1 border border-[#e2e8f0] select-none">
              <div
                className="absolute top-1 bottom-1 w-[calc(33.33%-2px)] rounded-lg bg-[#5865f2] shadow-sm transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(${["paid", "partial", "credit"].indexOf(payType) * 100}%)`,
                }}
              />
              {[
                { id: "paid", label: "Full Paid" },
                { id: "partial", label: "Partial" },
                { id: "credit", label: "Credit" },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPayType(o.id)}
                  className={cn(
                    "relative z-10 flex flex-1 items-center justify-center py-2 text-xs font-extrabold uppercase transition-colors duration-200 cursor-pointer select-none",
                    payType === o.id ? "text-white" : "text-[#64748b] hover:text-[#0f172a]"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {payType !== "credit" && (
            <div>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">
                Amount Paid {payType === "paid" ? "(Full)" : "(₹)"}
              </span>
              {payType === "paid" ? (
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm font-bold text-[#16a34a]">
                  {currency(Math.max(0, total - Number(discount || 0)))}
                </div>
              ) : (
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
              )}
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">Payment Method</span>
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel(m)}
                </option>
              ))}
            </Select>
          </div>

          <Button className="w-full h-11 font-bold text-base" size="lg" onClick={() => complete.mutate()} disabled={complete.isPending}>
            <CheckCircle2 size={18} />
            {complete.isPending ? "Completing Job..." : "Complete & Generate Invoice"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}