"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CircleCheckBig,
  MoveRight,
  Search,
  Check,
  Package,
  Pencil,
  Ban,
  RotateCcw,
  Car,
  Hash,
  Gauge,
  Wrench,
  IndianRupee,
  NotebookPen,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Button,
  Input,
  Select,
  Badge,
  BentoGrid,
  CircleButton,
  EmptyState,
  ErrorState,
  Field,
  HeroPanel,
  Panel,
  ResultPanel,
  SectionHeader,
  Skeleton,
  SpecTile,
  Step,
  Sheet,
  Textarea,
  Tile,
  type Tone,
} from "@/components/ui";
import { SpotOilCan, SpotTools, VEHICLE_SPOT } from "@/components/illustrations";
import {
  currency,
  formatDate,
  jobStatusLabel,
  vehicleTypeLabel,
  VEHICLE_TYPES,
  PAYMENT_METHODS,
  paymentMethodLabel,
} from "@/lib/format";
import { cn } from "@/lib/cn";

const PAY_TYPES = [
  { id: "paid", label: "Full paid" },
  { id: "partial", label: "Partial" },
  { id: "credit", label: "Credit" },
];

/** Line row shared by Parts Used and Labour: facts left, money right. */
function LineRow({
  title,
  meta,
  amount,
  onRemove,
  removeLabel,
}: {
  title: string;
  meta?: string;
  amount: string;
  onRemove?: () => void;
  removeLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-[var(--ink)]">{title}</p>
        {meta && <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="tabular text-sm font-extrabold text-[var(--ink)]">{amount}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            className={cn(
              "rounded-full p-1.5 text-[var(--ink-label)] cursor-pointer",
              "transition-[background-color,color,transform] duration-150 ease-out active:scale-90",
              "hover:bg-[var(--terracotta)]/12 hover:text-[var(--terracotta-hover)]",
            )}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

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
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // The invoice raised by a successful completion — a terminal moment, so the
  // sheet stays open on a ResultPanel for a beat before we hand over the invoice.
  const [issuedInvoice, setIssuedInvoice] = useState<any>(null);

  // add-part form
  const [partId, setPartId] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partSearch, setPartSearch] = useState("");
  // add-labour form
  const [labourDesc, setLabourDesc] = useState("");
  const [labourAmount, setLabourAmount] = useState("");
  // edit-job form
  const [editComplaint, setEditComplaint] = useState("");
  const [editWorkNotes, setEditWorkNotes] = useState("");
  const [editOdometer, setEditOdometer] = useState("");
  const [editVehicleType, setEditVehicleType] = useState("CAR");
  const [editVehicleName, setEditVehicleName] = useState("");
  const [editRegistration, setEditRegistration] = useState("");
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
  // Billing works off the discounted total, not the raw subtotal.
  const finalTotal = Math.max(0, total - Number(discount || 0));
  const partialTooHigh = payType === "partial" && Number(payAmount || 0) > finalTotal;

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

  const setStatus = useMutation({
    mutationFn: (status: string) =>
      api(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_res, status) => {
      toast.success(status === "CANCELLED" ? "Job cancelled" : "Job reopened");
      setCancelOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveJob = useMutation({
    mutationFn: () =>
      api(`/api/jobs/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          complaint: editComplaint,
          workNotes: editWorkNotes,
          odometerReading: editOdometer,
          vehicleType: editVehicleType,
          vehicleName: editVehicleName,
          registrationNumber: editRegistration,
        }),
      }),
    onSuccess: () => {
      toast.success("Job updated");
      setEditOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeJob = useMutation({
    mutationFn: () => api(`/api/jobs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Job deleted");
      setDeleteOpen(false);
      invalidate();
      router.push("/jobs");
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
              ? { amount: finalTotal, method: payMethod }
              : payType === "partial"
                ? { amount: Number(payAmount || 0), method: payMethod }
                : null,
        }),
      }),
    onSuccess: (res: any) => {
      // Terminal outcome: the sheet swaps to a ResultPanel, then hands over
      // to the invoice it just raised.
      setIssuedInvoice(res.invoice);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Auto-advance to the invoice once the success panel has been seen.
  useEffect(() => {
    if (!issuedInvoice?.id) return;
    const t = setTimeout(() => router.push(`/invoices/${issuedInvoice.id}`), 1600);
    return () => clearTimeout(t);
  }, [issuedInvoice, router]);

  const moveToShop = (part: any) => {
    setTransferPart(part);
    setTransferOpen(true);
  };

  const openEdit = () => {
    setEditComplaint(job?.complaint ?? "");
    setEditWorkNotes(job?.workNotes ?? "");
    setEditOdometer(job?.odometerReading ?? "");
    setEditVehicleType(data?.vehicle?.vehicleType ?? "CAR");
    setEditVehicleName(data?.vehicle?.vehicleName ?? "");
    setEditRegistration(data?.vehicle?.registrationNumber ?? "");
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Skeleton className="h-56 rounded-[var(--r-panel)]" />
        <BentoGrid className="grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </BentoGrid>
        <Skeleton className="h-40 rounded-[var(--r-card)]" />
        <Skeleton className="h-40 rounded-[var(--r-panel)]" />
        <Skeleton className="h-40 rounded-[var(--r-tile)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <ErrorState
          title="Couldn't load this job"
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Job not found"
          description="This job may have been deleted. Head back to the list to find another."
          illustration={<SpotTools size={84} />}
          action={
            <Button onClick={() => router.push("/jobs")}>
              <ArrowLeft size={18} /> Back to jobs
            </Button>
          }
        />
      </div>
    );
  }

  const heroTone: Tone =
    job.status === "COMPLETED" ? "forest" : job.status === "CANCELLED" ? "cream" : "terracotta";
  const heroOnDark = heroTone !== "cream";
  const vehicleType = data.vehicle?.vehicleType ?? "OTHER";
  const Spot = VEHICLE_SPOT[(vehicleType as keyof typeof VEHICLE_SPOT) ?? "OTHER"] ?? VEHICLE_SPOT.OTHER;
  const noteLines = String(job.workNotes ?? "")
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);

  const heroChip =
    "inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-wide " +
    (heroOnDark ? "bg-[var(--ink-on-dark)]/18" : "bg-[var(--surface-sunk)] text-[var(--ink)]");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <HeroPanel
        tone={heroTone}
        eyebrow={job.jobNumber}
        title={data.customer?.name ?? "Customer"}
        subtitle={`${vehicleTypeLabel(vehicleType)} · Opened ${formatDate(job.createdAt)}`}
        leading={
          <CircleButton onDark={heroOnDark} onClick={() => router.back()} aria-label="Back">
            <ArrowLeft size={18} />
          </CircleButton>
        }
        trailing={
          <>
            <span className={heroChip}>{jobStatusLabel(job.status)}</span>
            {job.status === "OPEN" && (
              <CircleButton onDark={heroOnDark} onClick={openEdit} aria-label="Edit job">
                <Pencil size={16} />
              </CircleButton>
            )}
          </>
        }
      >
        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-2">
            {data.vehicle?.vehicleName && <span className={heroChip}>{data.vehicle.vehicleName}</span>}
            {data.vehicle?.registrationNumber && (
              <span className={heroChip}>{data.vehicle.registrationNumber}</span>
            )}
            {data.customer?.phone && <span className={heroChip}>{data.customer.phone}</span>}
          </div>
          <span
            aria-hidden="true"
            className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[var(--r-tile)] bg-[var(--surface-bright)]"
          >
            <Spot size={68} />
          </span>
        </div>
      </HeroPanel>

      {/* ── The facts ────────────────────────────────────────────────── */}
      <BentoGrid className="grid-cols-3">
        <SpecTile
          tone="cream"
          label="Vehicle"
          value={vehicleTypeLabel(vehicleType)}
          icon={<Car size={17} />}
        />
        <SpecTile
          tone="bright"
          label="Registration"
          value={data.vehicle?.registrationNumber || "Not recorded"}
          icon={<Hash size={17} />}
        />
        <SpecTile
          tone="cream"
          label="Odometer"
          value={job.odometerReading ? `${job.odometerReading} km` : "Not recorded"}
          icon={<Gauge size={17} />}
        />
        <SpecTile tone="bright" label="Parts" value={jobParts.length} icon={<Package size={17} />} />
        <SpecTile tone="cream" label="Labour" value={labour.length} icon={<Wrench size={17} />} />
        <SpecTile
          tone="sage"
          label="Total"
          value={<span className="tabular">{currency(total)}</span>}
          icon={<IndianRupee size={17} />}
        />
      </BentoGrid>

      {/* ── Parts used ───────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Parts used"
          icon={<Package size={18} />}
          action={
            !completed ? (
              <Button size="sm" variant="outline" onClick={() => setAddPartOpen(true)}>
                <Plus size={16} /> Add part
              </Button>
            ) : undefined
          }
        />
        {!jobParts.length ? (
          <EmptyState
            title="No parts on this job"
            description={
              completed
                ? "This job was billed for labour only."
                : "Add the parts you fit and stock comes off the shop shelf when you complete the job."
            }
            illustration={<SpotOilCan size={84} />}
          />
        ) : (
          <div className="space-y-2">
            {jobParts.map((p: any) => (
              <LineRow
                key={p.id}
                title={p.partName}
                meta={`× ${p.quantity} @ ${currency(p.unitPrice)}`}
                amount={currency(p.totalPrice)}
                removeLabel={`Remove ${p.partName}`}
                onRemove={completed ? undefined : () => removePart.mutate(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Labour ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Labour"
          icon={<Wrench size={18} />}
          action={
            !completed ? (
              <Button size="sm" variant="outline" onClick={() => setAddLabourOpen(true)}>
                <Plus size={16} /> Add labour
              </Button>
            ) : undefined
          }
        />
        {!labour.length ? (
          <EmptyState
            title="No labour charged"
            description={
              completed
                ? "This job was billed for parts only."
                : "Charge for the work itself — diagnosis, fitting, servicing."
            }
            illustration={<SpotTools size={84} />}
          />
        ) : (
          <div className="space-y-2">
            {labour.map((l: any) => (
              <LineRow
                key={l.id}
                title={l.description}
                amount={currency(l.amount)}
                removeLabel={`Remove ${l.description}`}
                onRemove={completed ? undefined : () => removeLabour.mutate(l.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Work notes ───────────────────────────────────────────────── */}
      <Panel title="Work notes" icon={<NotebookPen size={18} />}>
        <p className="tile-label text-[var(--ink-on-dark-muted)]">Complaint</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-on-dark)]/90">
          {job.complaint || "No complaint was recorded when this job was opened."}
        </p>

        {noteLines.length > 1 ? (
          <div className="mt-5">
            <p className="tile-label mb-1 text-[var(--ink-on-dark-muted)]">What was done</p>
            {noteLines.map((line: string, i: number) => (
              <Step key={i} n={i + 1}>
                {line}
              </Step>
            ))}
          </div>
        ) : noteLines.length === 1 ? (
          <div className="mt-5">
            <p className="tile-label text-[var(--ink-on-dark-muted)]">What was done</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-on-dark)]/90">{noteLines[0]}</p>
          </div>
        ) : null}
      </Panel>

      {/* ── Totals & completion ──────────────────────────────────────── */}
      <Tile tone="forest" className="p-5">
        <span className="tile-label text-[var(--ink-on-dark-muted)]">Job total</span>
        <p className="numeral mt-2 truncate text-[clamp(2rem,10vw,3rem)]">{currency(total)}</p>
        <p className="mt-1.5 text-xs font-semibold text-[var(--ink-on-dark-muted)]">
          {jobParts.length} {jobParts.length === 1 ? "part" : "parts"} · {labour.length}{" "}
          {labour.length === 1 ? "labour line" : "labour lines"}
        </p>

        {!completed && (
          <Button size="lg" variant="secondary" className="mt-5 w-full" onClick={() => setCompleteOpen(true)}>
            <CircleCheckBig size={18} /> Complete job
          </Button>
        )}
        {completed && job.status === "COMPLETED" && data.invoice && (
          <Button
            size="lg"
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => router.push(`/invoices/${data.invoice.id}`)}
          >
            View invoice {data.invoice.invoiceNumber}
          </Button>
        )}
        {job.status === "CANCELLED" && (
          <p className="mt-5 text-sm font-semibold text-[var(--ink-on-dark-muted)]">
            This job is cancelled — nothing was billed and no stock was used.
          </p>
        )}
      </Tile>

      {/* ── Status / edit / delete — only while the job is not completed ── */}
      {job.status !== "COMPLETED" && (
        <Tile tone="cream" className="p-5">
          <p className="text-sm font-extrabold text-[var(--ink)]">Job actions</p>
          <p className="mt-1 text-xs font-semibold text-[var(--ink-muted)]">
            {job.status === "OPEN"
              ? "Edit the details, cancel or delete this job."
              : "This job is cancelled. Reopen it to keep working on it."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.status === "OPEN" && (
              <>
                <Button size="sm" variant="outline" onClick={openEdit}>
                  <Pencil size={16} /> Edit job
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
                  <Ban size={16} /> Cancel job
                </Button>
              </>
            )}
            {job.status === "CANCELLED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus.mutate("OPEN")}
                disabled={setStatus.isPending}
              >
                <RotateCcw size={16} /> {setStatus.isPending ? "Reopening…" : "Reopen job"}
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} /> Delete job
            </Button>
          </div>
        </Tile>
      )}

      {/* ── Edit job sheet ───────────────────────────────────────────── */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit job">
        <div className="space-y-4">
          <Field label="Complaint / work">
            <Textarea
              value={editComplaint}
              onChange={(e) => setEditComplaint(e.target.value)}
              placeholder="e.g. Brake noise at low speed"
              rows={2}
            />
          </Field>
          <Field label="Work notes" hint="One line per step reads back as a numbered method.">
            <Textarea
              value={editWorkNotes}
              onChange={(e) => setEditWorkNotes(e.target.value)}
              placeholder="Bled front brakes&#10;Replaced pads&#10;Road tested"
              rows={3}
            />
          </Field>
          <Field label="Odometer reading">
            <Input
              value={editOdometer}
              onChange={(e) => setEditOdometer(e.target.value)}
              placeholder="e.g. 42150"
            />
          </Field>
          <Field label="Vehicle type">
            <Select value={editVehicleType} onChange={(e) => setEditVehicleType(e.target.value)}>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {vehicleTypeLabel(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vehicle name / model">
            <Input
              value={editVehicleName}
              onChange={(e) => setEditVehicleName(e.target.value)}
              placeholder="e.g. Swift / Activa"
            />
          </Field>
          <Field
            label="Registration number"
            hint="A new registration number is treated as a different vehicle."
          >
            <Input
              value={editRegistration}
              onChange={(e) => setEditRegistration(e.target.value)}
              placeholder="e.g. WB 12 AB 3456"
            />
          </Field>
          <Button className="w-full" size="lg" onClick={() => saveJob.mutate()} disabled={saveJob.isPending}>
            {saveJob.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Sheet>

      {/* ── Cancel job confirmation ──────────────────────────────────── */}
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this job?">
        <div className="space-y-4">
          <Tile tone="ochre" className="text-xs font-bold leading-relaxed">
            {job.jobNumber} will be marked cancelled. Nothing is billed and no stock is used — you can
            reopen it later.
          </Tile>
          <Button
            className="w-full"
            size="lg"
            variant="danger"
            onClick={() => setStatus.mutate("CANCELLED")}
            disabled={setStatus.isPending}
          >
            <Ban size={16} /> {setStatus.isPending ? "Cancelling…" : "Yes, cancel job"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setCancelOpen(false)}>
            Keep job open
          </Button>
        </div>
      </Sheet>

      {/* ── Delete job confirmation ──────────────────────────────────── */}
      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this job?">
        <div className="space-y-4">
          <Tile tone="terracotta" className="text-xs font-bold leading-relaxed">
            {job.jobNumber} and its parts and labour lines are removed permanently. This cannot be
            undone.
          </Tile>
          <Button
            className="w-full"
            size="lg"
            variant="danger"
            onClick={() => removeJob.mutate()}
            disabled={removeJob.isPending}
          >
            <Trash2 size={16} /> {removeJob.isPending ? "Deleting…" : "Yes, delete job"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setDeleteOpen(false)}>
            Keep job
          </Button>
        </div>
      </Sheet>

      {/* ── Add part sheet ───────────────────────────────────────────── */}
      <Sheet open={addPartOpen} onClose={() => setAddPartOpen(false)} title="Add part to job">
        <div className="space-y-4">
          <div>
            <span className="tile-label mb-1.5 block text-[var(--ink-label)]">Search &amp; select part</span>
            <div className="relative mb-2">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
              />
              <Input
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Part name or part number"
                className="pl-10"
                aria-label="Search parts"
              />
            </div>

            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-[var(--r-control)] border border-[var(--hairline)] bg-[var(--surface)] p-1.5">
              {!(parts ?? []).length ? (
                <p className="p-4 text-center text-xs font-semibold text-[var(--ink-muted)]">
                  No parts in inventory yet.
                </p>
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
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPartId(p.id)}
                        aria-pressed={selected}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--r-control)] border p-2.5 text-left",
                          "transition-[background-color,border-color] duration-150 ease-out",
                          selected
                            ? "border-[var(--forest)] bg-[var(--sage)]"
                            : "border-[var(--hairline)] bg-[var(--surface-bright)] hover:bg-[var(--surface-sunk)]",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-control)] bg-[var(--surface-sunk)] text-[var(--ink)]">
                            <Package size={16} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-extrabold text-[var(--ink)]">
                              {p.name}
                            </span>
                            <span className="block truncate text-[11px] font-semibold text-[var(--ink-muted)]">
                              {p.partNumber ? `#${p.partNumber}` : "No part number"} ·{" "}
                              {currency(p.sellingPrice || p.unitPrice || 0)}
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Badge color={p.shopStock > 0 ? "green" : "gray"}>Shop {p.shopStock}</Badge>
                          <Badge color={p.warehouseStock > 0 ? "blue" : "gray"}>
                            W/H {p.warehouseStock}
                          </Badge>
                          {selected && <Check size={16} className="text-[var(--forest)]" />}
                        </span>
                      </button>
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
                <Tile tone="ochre" className="text-xs font-bold leading-relaxed">
                  Only {p.shopStock} in the shop. The warehouse has {p.warehouseStock}.
                  <Button
                    size="sm"
                    className="mt-2.5"
                    onClick={() => moveToShop({ partId: p.id, required: qty, shopStock: p.shopStock })}
                  >
                    <MoveRight size={14} /> Move {qty - p.shopStock} to shop
                  </Button>
                </Tile>
              );
            }
            if (p && qty > p.shopStock) {
              return (
                <Tile tone="terracotta" className="text-xs font-bold leading-relaxed">
                  Only {p.shopStock} in the shop and {p.warehouseStock} in the warehouse. Stock is
                  insufficient.
                </Tile>
              );
            }
            return null;
          })()}

          <Field label="Quantity">
            <Input
              type="number"
              min={1}
              value={partQty}
              onChange={(e) => setPartQty(e.target.value)}
            />
          </Field>

          <Button
            className="w-full"
            size="lg"
            onClick={() => addPart.mutate()}
            disabled={!partId || addPart.isPending}
          >
            {addPart.isPending ? "Adding…" : "Add to job"}
          </Button>
        </div>
      </Sheet>

      {/* ── Add labour sheet ─────────────────────────────────────────── */}
      <Sheet open={addLabourOpen} onClose={() => setAddLabourOpen(false)} title="Add labour charge">
        <div className="space-y-4">
          <Field label="Description">
            <Input
              value={labourDesc}
              onChange={(e) => setLabourDesc(e.target.value)}
              placeholder="e.g. Engine tuning / brake service"
            />
          </Field>
          <Field label="Amount (₹)">
            <Input
              type="number"
              value={labourAmount}
              onChange={(e) => setLabourAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Button
            className="w-full"
            size="lg"
            onClick={() => addLabour.mutate()}
            disabled={!labourDesc || !labourAmount || addLabour.isPending}
          >
            {addLabour.isPending ? "Adding…" : "Add labour to job"}
          </Button>
        </div>
      </Sheet>

      {/* ── Transfer sheet ───────────────────────────────────────────── */}
      <Sheet open={transferOpen} onClose={() => setTransferOpen(false)} title="Move stock to shop">
        {transferPart && (
          <div className="space-y-4">
            <Tile tone="cream">
              <p className="text-sm font-extrabold text-[var(--ink)]">
                {parts?.find((p: any) => p.id === transferPart.partId)?.name ?? "Part"}
              </p>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[var(--ink-muted)]">
                The shop has <strong className="text-[var(--ink)]">{transferPart.shopStock}</strong>,
                this job needs <strong className="text-[var(--ink)]">{transferPart.required}</strong>.
                Moving{" "}
                <strong className="text-[var(--ink)]">
                  {Math.max(1, transferPart.required - transferPart.shopStock)}
                </strong>{" "}
                from the warehouse.
              </p>
            </Tile>
            <Button
              className="w-full"
              size="lg"
              onClick={() => transfer.mutate(transferPart)}
              disabled={transfer.isPending}
            >
              <MoveRight size={16} /> {transfer.isPending ? "Moving…" : "Move stock to shop"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
          </div>
        )}
      </Sheet>

      {/* ── Complete job sheet ───────────────────────────────────────── */}
      <Sheet
        open={completeOpen}
        onClose={() => {
          setCompleteOpen(false);
          setIssuedInvoice(null);
        }}
        title={issuedInvoice ? "Job invoiced" : "Complete job & billing"}
      >
        {issuedInvoice ? (
          <ResultPanel
            status="success"
            title={`${job.jobNumber} is complete`}
            description={`Invoice ${issuedInvoice.invoiceNumber} for ${currency(
              issuedInvoice.total,
            )} has been raised. Taking you to it now.`}
            primaryAction={
              <Button size="lg" onClick={() => router.push(`/invoices/${issuedInvoice.id}`)}>
                View invoice
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <Tile tone="cream" className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--ink-muted)]">
                <span>Subtotal</span>
                <span className="tabular text-sm font-extrabold text-[var(--ink)]">
                  {currency(total)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--ink-muted)]">
                <span>Discount (₹)</span>
                <Input
                  type="number"
                  className="h-9 w-28 text-right font-bold"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  aria-label="Discount in rupees"
                />
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-[var(--hairline)] pt-2.5">
                <span className="text-sm font-extrabold text-[var(--ink)]">Final total</span>
                <span className="numeral tabular text-xl text-[var(--ink)]">
                  {currency(finalTotal)}
                </span>
              </div>
            </Tile>

            <div>
              <span className="tile-label mb-1.5 block text-[var(--ink-label)]">Payment type</span>
              <div
                role="tablist"
                aria-label="Payment type"
                className="flex select-none rounded-full bg-[var(--surface-sunk)] p-1"
              >
                {PAY_TYPES.map((o) => {
                  const active = payType === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setPayType(o.id)}
                      className={cn(
                        "relative isolate flex-1 cursor-pointer rounded-full px-2 py-2 text-xs font-extrabold",
                        "transition-[color] duration-150 ease-out",
                        active
                          ? "text-[var(--ink-on-dark)]"
                          : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="job-paytype-pill"
                          aria-hidden="true"
                          className="absolute inset-0 -z-10 rounded-full bg-[var(--forest)]"
                          transition={{ type: "spring", stiffness: 420, damping: 36 }}
                        />
                      )}
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {payType !== "credit" && (
              <div>
                <span className="tile-label mb-1.5 block text-[var(--ink-label)]">
                  {payType === "paid" ? "Amount paid (full)" : "Amount paid (₹)"}
                </span>
                {payType === "paid" ? (
                  <Tile tone="sage" className="py-3">
                    <span className="tabular text-sm font-extrabold">{currency(finalTotal)}</span>
                  </Tile>
                ) : (
                  <>
                    <Input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0.00"
                      aria-invalid={partialTooHigh}
                    />
                    {partialTooHigh && (
                      <p className="mt-1.5 text-xs font-bold text-[var(--terracotta-hover)]">
                        That is more than the final total of {currency(finalTotal)}.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Credit records no payment, so there is no method to pick. */}
            {payType !== "credit" && (
              <Field label="Payment method">
                <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabel(m)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {payType === "credit" && (
              <Tile tone="terracotta" className="text-xs font-bold leading-relaxed">
                The full {currency(finalTotal)} goes on the customer&apos;s account as outstanding
                credit. No payment is recorded now.
              </Tile>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={() => complete.mutate()}
              disabled={complete.isPending || partialTooHigh}
            >
              <CircleCheckBig size={18} />
              {complete.isPending ? "Completing job…" : "Complete & generate invoice"}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
