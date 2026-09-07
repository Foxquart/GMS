"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Car,
  FileText,
  IndianRupee,
  MessageCircle,
  Phone,
  Plus,
  Wrench,
} from "lucide-react";
import { ApiClientError, api, errorMessage, errorReference } from "@/lib/api";
import {
  Badge,
  BentoGrid,
  Button,
  CircleButton,
  EmptyState,
  ErrorState,
  HeroPanel,
  SectionHeader,
  Skeleton,
  SpecTile,
  StatTile,
  Tile,
  RecordBar,
} from "@/components/ui";
import { SpotClipboard, SpotTools, VEHICLE_SPOT } from "@/components/illustrations";
import { useGoBack } from "@/hooks/use-go-back";
import { cn } from "@/lib/cn";
import {
  currency,
  formatDate,
  invoiceStatusLabel,
  jobStatusLabel,
  vehicleTypeLabel,
} from "@/lib/format";

/* ─────────────────────────────────────────────────────────────────────
   Customer file.

   Billing is the headline: three figures, and — when the customer is on
   credit — a terracotta Due tile plus a direct route to the oldest unpaid
   invoice. Every list row keeps the same shape: identity left (min-w-0,
   truncating), money and status right (shrink-0, tabular).
   ───────────────────────────────────────────────────────────────────── */

const ROW_SHELL = cn(
  "flex items-center gap-3 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-3.5",
  "transition-[background-color,border-color,translate] duration-150 ease-out",
  "hover:-translate-y-px hover:border-[var(--hairline-strong)] hover:bg-[var(--surface)] active:translate-y-0",
);

/** Money inside a StatTile: full precision, one line, never truncated. */
const Figure = ({ value }: { value: number | string }) => (
  <span className="tabular text-[clamp(1.15rem,5.2vw,1.75rem)]">{currency(value)}</span>
);

function CustomerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-[176px] rounded-[var(--r-panel)]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Skeleton className="h-[116px]" />
        <Skeleton className="h-[116px]" />
        <Skeleton className="col-span-2 h-[116px] sm:col-span-1" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24 rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Skeleton className="h-[108px]" />
          <Skeleton className="h-[108px]" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 rounded-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[70px]" />
        ))}
      </div>
    </div>
  );
}

/**
 * The condensed record bar.
 *
 * The hero owns the back control, and a customer with a long history scrolls
 * it far out of reach — leaving no way back but the browser gesture. This
 * brings that control back, with just enough identity to know whose file the
 * rows beneath belong to.
 *
 * It lives in a zero-height sticky rail, so it costs nothing until it is
 * needed: no space is reserved while the hero is on screen, and the bar floats
 * over the page only once the hero has passed. `top-14` clears the mobile top
 * bar, `z-20` keeps it under that bar (z-30), the sidebar (z-40) and sheets
 * (z-50). The negative margins let the fill bleed to the page gutters so rows
 * do not show through at the edges as they pass under.
 */
export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const goBack = useGoBack("/customers");

  // The hero carries the back control until it scrolls away; from there the
  // condensed bar takes over. A callback ref (not useRef) because the hero
  // only mounts once the customer has loaded, and the observer has to wait
  // for it.
  const [heroEl, setHeroEl] = useState<HTMLDivElement | null>(null);
  const [heroGone, setHeroGone] = useState(false);

  // The bar is revealed at the moment its rail pins, so it never floats loose
  // in the gap: the mobile top bar is 56px and the rail sits 20px (space-y-5)
  // below the hero, which puts the meeting point at the hero's bottom edge
  // crossing 36px. On lg there is no top bar and it arrives those 36px of
  // scroll early — less than one flick.
  useEffect(() => {
    if (!heroEl || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setHeroGone(!entry.isIntersecting), {
      rootMargin: "-36px 0px 0px 0px",
    });
    io.observe(heroEl);
    return () => io.disconnect();
  }, [heroEl]);

  // Billing has to stay live: refetch when the tab regains focus / remounts so
  // the figures reflect payments recorded elsewhere in the app.
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api<any>(`/api/customers/${id}`),
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });

  if (isLoading) return <CustomerSkeleton />;

  // A 404 is not a failure to load — the record is simply gone, and the empty
  // state (with a way back) says that better than an error panel would.
  const missing =
    (isError && error instanceof ApiClientError && error.status === 404) || (!isError && !data);

  if (missing) {
    return (
      <EmptyState
        title="Customer not found"
        description="This record may have been removed. Head back to the registry to find them."
        illustration={<SpotTools size={84} />}
        action={
          <Link href="/customers">
            <Button variant="outline">Back to customers</Button>
          </Link>
        }
      />
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[176px] rounded-[var(--r-panel)]" />
        <ErrorState
          title="Couldn't load this customer"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const { customer, stats, jobs, invoices, vehicles } = data;

  const onCredit = Number(stats?.outstanding ?? 0) > 0;
  const unpaidInvoices = ((invoices ?? []) as any[]).filter(
    (inv) => Number(inv.dueAmount) > 0 && inv.status !== "CANCELLED" && inv.status !== "PAID",
  );
  const unpaidCount = Number(stats?.unpaidInvoiceCount ?? unpaidInvoices.length);
  const oldestUnpaid = [...unpaidInvoices].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )[0];

  // Phone is optional on a customer record, so both contact actions are
  // conditional. A `tel:` with nothing after it opens the dialler empty, and
  // `wa.me/` with no number opens WhatsApp's own error page — offering either
  // is worse than not offering it.
  const phoneDigits = (customer.phone ?? "").replace(/[^0-9]/g, "");
  const canContact = phoneDigits.length > 0;
  const formattedWaPhone = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
  const waHref = `https://wa.me/${formattedWaPhone}?text=${encodeURIComponent(
    `Hello ${customer.name}, regarding your service at our workshop:`,
  )}`;

  return (
    <div className="space-y-5">
      <div ref={setHeroEl}>
        <HeroPanel
          tone="forest"
          title={customer.name}
          subtitle={customer.phone ?? "No phone on file"}
          eyebrow="Customer"
          leading={
            <CircleButton onClick={goBack} aria-label="Back">
              <ArrowLeft size={18} />
            </CircleButton>
          }
          trailing={
            canContact ? (
              <>
                <CircleButton
                  onClick={() => {
                    window.location.href = `tel:${customer.phone}`;
                  }}
                  aria-label={`Call ${customer.name}`}
                  title="Call"
                >
                  <Phone size={18} />
                </CircleButton>
                <CircleButton
                  onClick={() => window.open(waHref, "_blank", "noopener,noreferrer")}
                  aria-label={`Message ${customer.name} on WhatsApp`}
                  title="WhatsApp"
                >
                  <MessageCircle size={18} />
                </CircleButton>
              </>
            ) : undefined
          }
        >
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={`/jobs/new?customerId=${id}`}>
              <Button variant="secondary" size="sm">
                <Plus size={14} /> New job
              </Button>
            </Link>
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--ink-on-dark-muted)]">
              {customer.address
                ? customer.address
                : `${stats.jobCount} ${stats.jobCount === 1 ? "job" : "jobs"} on record`}
            </p>
            {isFetching && (
              <span className="tile-label shrink-0 text-[var(--ink-on-dark-muted)]" role="status">
                Updating…
              </span>
            )}
          </div>
        </HeroPanel>
      </div>

      {/* ── Condensed record bar — arrives when the hero leaves ─────── */}
      <RecordBar
        shown={heroGone}
        onBack={goBack}
        title={customer.name}
        meta={
          customer.phone ? (
            <span className="tabular">{customer.phone}</span>
          ) : (
            <span>No phone on file</span>
          )
        }
        trailing={
          onCredit ? (
            <div className="shrink-0 text-right">
              <p className="tile-label text-[var(--ink-label)]">Due</p>
              <p className="tabular text-sm font-extrabold text-[var(--terracotta-hover)]">
                {currency(stats.outstanding)}
              </p>
            </div>
          ) : undefined
        }
      />

      <BentoGrid className="sm:grid-cols-3">
        <StatTile
          tone="cream"
          label="Billed"
          value={<Figure value={stats.billed} />}
          footnote={`${stats.invoiceCount} ${stats.invoiceCount === 1 ? "invoice" : "invoices"} raised`}
        />
        <StatTile
          tone="sage"
          label="Paid"
          value={<Figure value={stats.paid} />}
          footnote="Received to date"
        />
        <StatTile
          tone={onCredit ? "terracotta" : "cream"}
          label="Due"
          value={<Figure value={stats.outstanding} />}
          icon={onCredit ? <IndianRupee size={16} /> : undefined}
          footnote={
            onCredit
              ? `${unpaidCount} unpaid ${unpaidCount === 1 ? "invoice" : "invoices"}`
              : "Nothing outstanding"
          }
          className="col-span-2 sm:col-span-1"
        />
      </BentoGrid>

      {onCredit && (
        <Tile
          tone="cream"
          className="flex flex-wrap items-center justify-between gap-3 border-[var(--terracotta)]/25 bg-[var(--terracotta)]/8"
        >
          <div className="min-w-0">
            <Badge color="red" dot>
              ON CREDIT
            </Badge>
            <p className="mt-2 text-xs font-semibold text-[var(--ink-muted)]">
              <span className="tabular font-extrabold text-[var(--terracotta-hover)]">
                {currency(stats.outstanding)}
              </span>{" "}
              unpaid across {unpaidCount} {unpaidCount === 1 ? "invoice" : "invoices"}
            </p>
          </div>
          {oldestUnpaid && (
            <Link href={`/invoices/${oldestUnpaid.id}`} className="shrink-0">
              <Button variant="danger" size="sm">
                <IndianRupee size={14} /> Record payment
              </Button>
            </Link>
          )}
        </Tile>
      )}

      {vehicles?.length > 0 && (
        <section>
          <SectionHeader
            title="Vehicles"
            icon={<Car size={16} className="text-[var(--ink-label)]" />}
          />
          <BentoGrid className="sm:grid-cols-4">
            {(vehicles as any[]).map((v, i) => {
              const Spot = VEHICLE_SPOT[v.vehicleType as keyof typeof VEHICLE_SPOT] ?? SpotTools;
              return (
                <SpecTile
                  key={v.id}
                  tone={i % 2 === 0 ? "bright" : "cream"}
                  icon={<Spot size={44} />}
                  label={vehicleTypeLabel(v.vehicleType)}
                  value={
                    <span className="flex flex-col items-center gap-1">
                      <span className="max-w-full truncate">
                        {v.vehicleName || vehicleTypeLabel(v.vehicleType)}
                      </span>
                      {v.registrationNumber && (
                        <span className="tile-label tabular text-[var(--ink-label)]">
                          {v.registrationNumber}
                        </span>
                      )}
                    </span>
                  }
                />
              );
            })}
          </BentoGrid>
        </section>
      )}

      <section>
        <SectionHeader
          title="Recent jobs"
          icon={<Wrench size={16} className="text-[var(--ink-label)]" />}
          action={
            <Link href={`/jobs/new?customerId=${id}`}>
              <Button variant="ghost" size="sm">
                <Plus size={14} /> New job
              </Button>
            </Link>
          }
        />
        {!jobs?.length ? (
          <EmptyState
            title="No jobs on this file yet"
            description="Book the first job and it will show up here with its invoice."
            illustration={<SpotTools size={84} />}
            action={
              <Link href={`/jobs/new?customerId=${id}`}>
                <Button>
                  <Plus size={16} /> Create a job
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {(jobs as any[]).map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="block rounded-[var(--r-tile)]">
                <article className={ROW_SHELL}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                      {j.complaint || "Service job"}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                      <span className="tabular">{j.jobNumber}</span> · {formatDate(j.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {Number(j.total) > 0 && (
                      <span className="tabular text-sm font-extrabold text-[var(--ink)]">
                        {currency(j.total)}
                      </span>
                    )}
                    <Badge
                      color={
                        j.status === "COMPLETED" ? "green" : j.status === "CANCELLED" ? "red" : "amber"
                      }
                      dot
                    >
                      {jobStatusLabel(j.status)}
                    </Badge>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Invoices"
          icon={<FileText size={16} className="text-[var(--ink-label)]" />}
        />
        {!invoices?.length ? (
          <EmptyState
            title="No invoices yet"
            description="An invoice is raised the moment a job is marked complete."
            illustration={<SpotClipboard size={84} />}
          />
        ) : (
          <div className="space-y-2.5">
            {(invoices as any[]).map((inv) => {
              const due = Number(inv.dueAmount);
              return (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="block rounded-[var(--r-tile)]"
                >
                  <article className={ROW_SHELL}>
                    <div className="min-w-0 flex-1">
                      <p className="tabular truncate text-sm font-extrabold text-[var(--ink)]">
                        {inv.invoiceNumber}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-[var(--ink-muted)]">
                        {formatDate(inv.createdAt)}
                        {due > 0 && inv.status !== "CANCELLED" ? (
                          <span className="tabular text-[var(--terracotta-hover)]">
                            {" "}
                            · {currency(due)} due
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="tabular text-sm font-extrabold text-[var(--ink)]">
                        {currency(inv.total)}
                      </span>
                      <Badge
                        color={
                          inv.status === "PAID"
                            ? "green"
                            : inv.status === "CANCELLED"
                              ? "gray"
                              : due > 0
                                ? "red"
                                : "slate"
                        }
                        dot
                      >
                        {invoiceStatusLabel(inv.status)}
                      </Badge>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
