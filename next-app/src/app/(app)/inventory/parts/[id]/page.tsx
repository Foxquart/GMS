"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowDownToLine,
  Settings2,
  ArrowLeftRight,
  ArrowRight,
  Store,
  Warehouse,
  History,
  Pencil,
  Plus,
  Trash2,
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
  SectionHeader,
  Select,
  Sheet,
  Skeleton,
  SpecTile,
  StatTile,
  Textarea,
  Tile,
  type Tone,
} from "@/components/ui";
import { SpotTools } from "@/components/illustrations";
import { currency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const movementLabel = (m: string) =>
  m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const movementColor = (m: string) =>
  m === "STOCK_IN" || m === "TRANSFER_IN"
    ? "green"
    : m === "JOB_USAGE" || m === "TRANSFER_OUT"
      ? "amber"
      : m === "ADJUSTMENT"
        ? "blue"
        : "slate";

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [eName, setEName] = useState("");
  const [ePartNumber, setEPartNumber] = useState("");
  const [eBrand, setEBrand] = useState("");
  const [eSelling, setESelling] = useState("");
  const [ePurchase, setEPurchase] = useState("");
  const [eUnit, setEUnit] = useState("pcs");
  const [eMinShop, setEMinShop] = useState("0");
  const [eMinWarehouse, setEMinWarehouse] = useState("0");
  const [eDescription, setEDescription] = useState("");
  const [eAttributes, setEAttributes] = useState<{ label: string; value: string }[]>([]);

  const [stockInOpen, setStockInOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const [qty, setQty] = useState("1");
  const [location, setLocation] = useState<"SHOP" | "WAREHOUSE">("WAREHOUSE");
  const [newQty, setNewQty] = useState("0");
  const [note, setNote] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["part", id],
    queryFn: () => api<any>(`/api/parts/${id}`),
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api<any[]>("/api/suppliers"),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<any[]>("/api/categories"),
  });

  const { data: movements, isPending: movPending, isError: movError, refetch: refetchMovements } =
    useQuery({
      queryKey: ["movements", id],
      queryFn: () => api<any[]>("/api/inventory/movements", { params: { partId: id } }),
    });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["part", id] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
    qc.invalidateQueries({ queryKey: ["parts"] });
    qc.invalidateQueries({ queryKey: ["movements", id] });
    qc.invalidateQueries({ queryKey: ["transfers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const stockIn = useMutation({
    mutationFn: () =>
      api("/api/inventory/stock-in", {
        method: "POST",
        body: JSON.stringify({
          partId: id,
          quantity: Number(qty),
          locationCode: location,
          supplierId: supplierId || undefined,
          notes: note || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success(`${qty} ${data?.unit ?? "pcs"} added to ${location === "SHOP" ? "shop" : "warehouse"}`);
      setStockInOpen(false);
      setQty("1");
      setNote("");
      setSupplierId("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const adjust = useMutation({
    mutationFn: () =>
      api("/api/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          partId: id,
          newQuantity: Number(newQty),
          locationCode: location,
          notes: note || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success(`${location === "SHOP" ? "Shop" : "Warehouse"} count set to ${newQty}`);
      setAdjustOpen(false);
      setNote("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const transfer = useMutation({
    mutationFn: () =>
      api("/api/inventory/transfers", {
        method: "POST",
        body: JSON.stringify({ partId: id, quantity: Number(qty), notes: note || undefined }),
      }),
    onSuccess: () => {
      toast.success(`${qty} moved from warehouse to shop`);
      setTransferOpen(false);
      setQty("1");
      setNote("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveEdit = useMutation({
    mutationFn: () =>
      api("/api/parts", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          name: eName,
          partNumber: ePartNumber || null,
          brand: eBrand || null,
          sellingPrice: Number(eSelling || 0),
          purchasePrice: Number(ePurchase || 0),
          unit: eUnit || "pcs",
          minimumShopStock: Number(eMinShop || 0),
          minimumWarehouseStock: Number(eMinWarehouse || 0),
          description: eDescription || null,
          attributes: eAttributes.filter((a) => a.label.trim() || a.value.trim()),
        }),
      }),
    onSuccess: () => {
      toast.success("Part updated");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["part", id] });
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setEAttr = (i: number, patch: Partial<{ label: string; value: string }>) =>
    setEAttributes((rows) => rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  const openEdit = () => {
    setEName(part?.name ?? "");
    setEPartNumber(part?.partNumber ?? "");
    setEBrand(part?.brand ?? "");
    setESelling(String(part?.sellingPrice ?? ""));
    setEPurchase(String(part?.purchasePrice ?? ""));
    setEUnit(part?.unit ?? "pcs");
    setEMinShop(String(part?.minimumShopStock ?? 0));
    setEMinWarehouse(String(part?.minimumWarehouseStock ?? 0));
    setEDescription(part?.description ?? "");
    setEAttributes(part?.attributes ?? []);
    setEditOpen(true);
  };

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Skeleton className="h-48 rounded-[var(--r-panel)]" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <CircleButton onDark={false} onClick={() => router.back()} aria-label="Back">
            <ArrowLeft size={18} />
          </CircleButton>
          <h1 className="text-xl font-extrabold text-[var(--ink)]">Part</h1>
        </div>
        <ErrorState
          message={(error as Error)?.message ?? "This part didn't load."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <EmptyState
          illustration={<SpotTools size={84} />}
          title="That part isn't on file"
          description="It may have been archived or removed from the inventory."
          action={
            <Link href="/inventory">
              <Button variant="outline">Back to inventory</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const part = data;
  const unit = part.unit || "pcs";
  const balances = Object.fromEntries((data.balances ?? []).map((b: any) => [b.code, b.quantity]));
  const shopStock = Number(balances.SHOP ?? 0);
  const warehouseStock = Number(balances.WAREHOUSE ?? 0);
  const total = shopStock + warehouseStock;
  const minShop = Number(part.minimumShopStock ?? 0);
  const minWarehouse = Number(part.minimumWarehouseStock ?? 0);

  const categoryName =
    (categories ?? []).find((c: any) => c.id === part.categoryId)?.name ?? "Uncategorised";
  const supplierName =
    (suppliers ?? []).find((s: any) => s.id === part.supplierId)?.name ?? "No supplier";

  const outOfStock = total <= 0;
  const runningLow = !outOfStock && (shopStock < minShop || warehouseStock < minWarehouse);
  const heroTone: Tone = outOfStock ? "terracotta" : runningLow ? "ochre" : "forest";
  const heroStatus = outOfStock ? "Out of stock" : runningLow ? "Running low" : "In stock";

  const shopTone: Tone = shopStock <= 0 ? "terracotta" : shopStock < minShop ? "ochre" : "sage";
  const warehouseTone: Tone =
    warehouseStock <= 0 ? "terracotta" : warehouseStock < minWarehouse ? "ochre" : "cream";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <HeroPanel
        tone={heroTone}
        eyebrow={categoryName}
        title={part.name}
        subtitle={`${part.partNumber || "No part number"} · ${part.brand || "No brand"}`}
        leading={
          <CircleButton onClick={() => router.back()} aria-label="Back">
            <ArrowLeft size={18} />
          </CircleButton>
        }
        trailing={
          <>
            <span className="rounded-full bg-white/18 px-3 py-1.5 text-[11px] font-extrabold tracking-wide">
              {heroStatus}
            </span>
            <CircleButton onClick={openEdit} aria-label="Edit part">
              <Pencil size={16} />
            </CircleButton>
          </>
        }
      >
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/15 pt-4">
          <div>
            <p className="tile-label opacity-70">Total on hand</p>
            <p className="numeral mt-1 text-[clamp(2rem,9vw,3rem)]">{total}</p>
          </div>
          <p className="pb-1.5 text-sm font-bold opacity-75">{unit}</p>
        </div>
      </HeroPanel>

      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => setStockInOpen(true)}>
          <ArrowDownToLine size={16} />
          <span className="truncate">Stock in</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setLocation("SHOP");
            setNewQty(String(shopStock));
            setAdjustOpen(true);
          }}
        >
          <Settings2 size={16} />
          <span className="truncate">Adjust</span>
        </Button>
        <Button variant="secondary" onClick={() => setTransferOpen(true)}>
          <ArrowLeftRight size={16} />
          <span className="truncate">To shop</span>
        </Button>
      </div>

      {/* ── Balances ───────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Where the stock sits" />
        <BentoGrid>
          <StatTile
            tone={shopTone}
            label="Shop floor"
            value={shopStock}
            unit={unit}
            footnote={`Minimum ${minShop}`}
            icon={<Store size={18} />}
          />
          <StatTile
            tone={warehouseTone}
            label="Warehouse"
            value={warehouseStock}
            unit={unit}
            footnote={`Minimum ${minWarehouse}`}
            icon={<Warehouse size={18} />}
          />
        </BentoGrid>
      </section>

      {/* ── Specification ──────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Part details" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SpecTile label="Part number" value={part.partNumber || "—"} />
          <SpecTile label="Brand" value={part.brand || "—"} />
          <SpecTile label="Category" value={categoryName} />
          <SpecTile label="Supplier" value={supplierName} />
          <SpecTile label="Unit" value={unit} />
          <SpecTile
            tone="sage"
            label="Selling price"
            value={<span className="tabular">{currency(part.sellingPrice)}</span>}
          />
          <SpecTile
            label="Purchase price"
            value={<span className="tabular">{currency(part.purchasePrice)}</span>}
          />
          <SpecTile label="Min shop" value={minShop} />
          <SpecTile label="Min warehouse" value={minWarehouse} />
        </div>
        {!!part.attributes?.length && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {part.attributes.map(
              (a: { label: string; value: string }, i: number) => (
                <SpecTile key={i} label={a.label || "Field"} value={a.value || "—"} tone="cream" />
              ),
            )}
          </div>
        )}
        {part.description && (
          <Tile tone="cream" className="mt-3">
            <p className="tile-label text-[var(--ink-label)]">Notes</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">
              {part.description}
            </p>
          </Tile>
        )}
      </section>

      {/* ── Movement history ───────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Movement history"
          icon={<History size={16} />}
          action={
            <Link
              href={`/inventory/movements?partId=${id}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold text-[var(--ink-muted)]",
                "transition-[background-color,color] duration-150 ease-out",
                "hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
              )}
            >
              See all <ArrowRight size={13} />
            </Link>
          }
        />
        {movPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[62px]" />
            ))}
          </div>
        ) : movError ? (
          <ErrorState
            title="Couldn't load the history"
            message="The movement log for this part didn't come back."
            onRetry={() => refetchMovements()}
          />
        ) : !movements?.length ? (
          <EmptyState
            illustration={<SpotTools size={72} />}
            title="No stock movements yet"
            description="Stock-ins, adjustments and transfers for this part will be logged here."
            action={
              <Button variant="outline" onClick={() => setStockInOpen(true)}>
                <ArrowDownToLine size={16} /> Record a stock-in
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {movements.slice(0, 8).map((m: any) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                    <span
                      className={cn(
                        "tabular",
                        m.quantity > 0 ? "text-[var(--forest)]" : "text-[var(--terracotta-hover)]",
                      )}
                    >
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </span>{" "}
                    {unit}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                    {m.locationCode === "SHOP" ? "Shop" : "Warehouse"} · {formatDateTime(m.createdAt)}
                  </p>
                </div>
                <div className="shrink-0">
                  <Badge color={movementColor(m.movementType)}>
                    {movementLabel(m.movementType)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Stock in ───────────────────────────────────────────────── */}
      <Sheet open={stockInOpen} onClose={() => setStockInOpen(false)} title="Stock in">
        <div className="space-y-3.5">
          <Field label="Location">
            <Select value={location} onChange={(e) => setLocation(e.target.value as any)}>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="SHOP">Shop floor</option>
            </Select>
          </Field>
          <Field label={`Quantity (${unit})`}>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="tabular"
            />
          </Field>
          <Field label="Supplier">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">No supplier</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Invoice number, delivery note…"
            />
          </Field>
          <Button
            className="w-full"
            size="lg"
            onClick={() => stockIn.mutate()}
            disabled={stockIn.isPending || Number(qty) < 1}
          >
            {stockIn.isPending ? "Adding stock…" : "Add stock"}
          </Button>
        </div>
      </Sheet>

      {/* ── Adjust ─────────────────────────────────────────────────── */}
      <Sheet open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust stock">
        <div className="space-y-3.5">
          <Field label="Location">
            <Select
              value={location}
              onChange={(e) => {
                const next = e.target.value as "SHOP" | "WAREHOUSE";
                setLocation(next);
                setNewQty(String(next === "SHOP" ? shopStock : warehouseStock));
              }}
            >
              <option value="SHOP">Shop floor</option>
              <option value="WAREHOUSE">Warehouse</option>
            </Select>
          </Field>
          <Field
            label={`Counted quantity (${unit})`}
            hint={`Currently recorded: ${location === "SHOP" ? shopStock : warehouseStock} ${unit}`}
          >
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className="tabular"
            />
          </Field>
          <Field label="Reason">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Stock count correction, damaged item…"
            />
          </Field>
          <Button
            className="w-full"
            size="lg"
            onClick={() => adjust.mutate()}
            disabled={adjust.isPending}
          >
            {adjust.isPending ? "Saving adjustment…" : "Save adjustment"}
          </Button>
        </div>
      </Sheet>

      {/* ── Move to shop ───────────────────────────────────────────── */}
      <Sheet open={transferOpen} onClose={() => setTransferOpen(false)} title="Move to shop">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-3 rounded-[var(--r-tile)] bg-[var(--surface-sunk)] px-4 py-3">
            <div>
              <p className="tile-label text-[var(--ink-label)]">Warehouse</p>
              <p className="numeral mt-1 text-xl text-[var(--ink)]">{warehouseStock}</p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-[var(--ink-label)]" />
            <div className="text-right">
              <p className="tile-label text-[var(--ink-label)]">Shop floor</p>
              <p className="numeral mt-1 text-xl text-[var(--ink)]">{shopStock}</p>
            </div>
          </div>
          <Field label={`Quantity (${unit})`}>
            <Input
              type="number"
              min={1}
              max={warehouseStock}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="tabular"
            />
          </Field>
          <Button
            className="w-full"
            size="lg"
            onClick={() => transfer.mutate()}
            disabled={transfer.isPending || warehouseStock < 1 || Number(qty) < 1}
          >
            {transfer.isPending ? "Moving stock…" : "Move to shop"}
          </Button>
          {warehouseStock < 1 && (
            <p className="text-center text-xs font-semibold text-[var(--ink-muted)]">
              There is nothing in the warehouse to move.
            </p>
          )}
        </div>
      </Sheet>

      {/* ── Edit part ─────────────────────────────────────────────────── */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit part">
        <div className="space-y-4">
          <Field label="Part name">
            <Input value={eName} onChange={(e) => setEName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Part number">
              <Input value={ePartNumber} onChange={(e) => setEPartNumber(e.target.value)} />
            </Field>
            <Field label="Brand">
              <Input value={eBrand} onChange={(e) => setEBrand(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Selling price (₹)">
              <Input type="number" min={0} className="tabular" value={eSelling} onChange={(e) => setESelling(e.target.value)} />
            </Field>
            <Field label="Purchase price (₹)">
              <Input type="number" min={0} className="tabular" value={ePurchase} onChange={(e) => setEPurchase(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Min shop">
              <Input type="number" min={0} className="tabular" value={eMinShop} onChange={(e) => setEMinShop(e.target.value)} />
            </Field>
            <Field label="Min w/house">
              <Input type="number" min={0} className="tabular" value={eMinWarehouse} onChange={(e) => setEMinWarehouse(e.target.value)} />
            </Field>
            <Field label="Unit">
              <Input value={eUnit} onChange={(e) => setEUnit(e.target.value)} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={3} value={eDescription} onChange={(e) => setEDescription(e.target.value)} />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="tile-label text-[var(--ink-label)]">Custom fields</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEAttributes((r) => [...r, { label: "", value: "" }])}
              >
                <Plus size={14} /> Add field
              </Button>
            </div>
            {!eAttributes.length ? (
              <p className="text-xs text-[var(--ink-muted)]">No custom fields on this part yet.</p>
            ) : (
              <div className="space-y-2">
                {eAttributes.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={row.label}
                      onChange={(e) => setEAttr(i, { label: e.target.value })}
                      placeholder="Field"
                      className="flex-1"
                      aria-label={`Custom field ${i + 1} name`}
                    />
                    <Input
                      value={row.value}
                      onChange={(e) => setEAttr(i, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1"
                      aria-label={`Custom field ${i + 1} value`}
                    />
                    <CircleButton
                      type="button"
                      onDark={false}
                      onClick={() => setEAttributes((r) => r.filter((_, n) => n !== i))}
                      aria-label={`Remove custom field ${i + 1}`}
                      className="h-9 w-9 shrink-0"
                    >
                      <Trash2 size={15} />
                    </CircleButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => saveEdit.mutate()}
            disabled={!eName.trim() || saveEdit.isPending}
          >
            {saveEdit.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
