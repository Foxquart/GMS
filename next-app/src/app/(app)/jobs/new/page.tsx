"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, UserPlus, User, Car, Sparkles } from "lucide-react";
import { ApiClientError, api, errorMessage, errorReference } from "@/lib/api";
import {
  Button,
  InlineError,
  Input,
  Field,
  Textarea,
  Skeleton,
  Tile,
  CircleButton,
  SectionHeader,
} from "@/components/ui";
import { AnimatedDropdown } from "@/components/animated-dropdown";
import { SearchSelect } from "@/components/search-select";
import { VEHICLE_TYPES, currency, vehicleTypeLabel } from "@/lib/format";
import { VEHICLE_SPOT } from "@/components/illustrations";

export default function NewJobPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header className="flex items-center gap-3">
        <CircleButton onDark={false} onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={18} />
        </CircleButton>
        <div className="min-w-0">
          <p className="tile-label text-[var(--ink-label)]">Open a job card</p>
          <h1 className="mt-1 text-[clamp(1.5rem,7vw,2rem)] font-extrabold leading-none tracking-tight text-[var(--ink)]">
            New job
          </h1>
        </div>
      </header>

      {/* useSearchParams() must sit inside a Suspense boundary (App Router). */}
      <Suspense fallback={<NewJobFormSkeleton />}>
        <NewJobForm />
      </Suspense>
    </div>
  );
}

function NewJobFormSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading the job form">
      <Skeleton className="h-[4.75rem] rounded-[var(--r-card)]" />
      <Skeleton className="h-[19rem] rounded-[var(--r-card)]" />
      <Skeleton className="h-[9.5rem] rounded-[var(--r-card)]" />
      <Skeleton className="h-12 rounded-full" />
    </div>
  );
}

// Vehicle fields the operator typed, tagged with the customer they belong to so
// that switching customer drops them instead of clobbering the new prefill.
type VehicleEdits = {
  customerId: string;
  vehicleType?: string;
  vehicleName?: string;
  registrationNumber?: string;
};

function NewJobForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  // Deep link from the customer page: /jobs/new?customerId=<id>
  const presetCustomerId = searchParams.get("customerId") ?? "";

  const [customerId, setCustomerId] = useState(presetCustomerId);
  // Once someone is chosen the picker collapses to a summary of them; Change
  // opens it again. A deep link arrives already chosen.
  const [lockedCustomer, setLockedCustomer] = useState(Boolean(presetCustomerId));
  // The chosen customer as last seen. The search results are whatever was
  // typed last, so the pick has to survive the list moving on underneath it.
  const [chosen, setChosen] = useState<any>(null);
  const [customerQ, setCustomerQ] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [complaint, setComplaint] = useState("");
  const [edits, setEdits] = useState<VehicleEdits>({ customerId: presetCustomerId });
  const [picked, setPicked] = useState<{ customerId: string; id: string } | null>(null);
  // Both failures belong to the form in front of the operator, so they render
  // inline where the action was taken rather than in a toast.
  const [customerError, setCustomerError] = useState<unknown>(null);
  const [jobError, setJobError] = useState<unknown>(null);

  // Typing searches on its own — the registry is a list you look someone up
  // in, not a menu you scroll.
  useEffect(() => {
    const t = setTimeout(() => setCustomerSearch(customerQ.trim()), 250);
    return () => clearTimeout(t);
  }, [customerQ]);

  const {
    data: customers,
    isPending: customersPending,
    isFetching: customersFetching,
    isError: customersFailed,
    error: customersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: () => api<any[]>("/api/customers", { params: { q: customerSearch || undefined } }),
    placeholderData: keepPreviousData,
  });

  // Newest-first list of this customer's vehicles (Bug 3: autofill last visit).
  const { data: customerVehicles } = useQuery({
    queryKey: ["vehicles", customerId],
    queryFn: () => api<any[]>("/api/vehicles", { params: { customerId } }),
    enabled: Boolean(customerId),
  });

  const selectedCustomer =
    (chosen?.id === customerId ? chosen : null) ?? (customers ?? []).find((c) => c.id === customerId);


  const vehicles = customerId ? (customerVehicles ?? []) : [];
  const pickedId = picked?.customerId === customerId ? picked.id : "";
  const prefill = vehicles.find((v: any) => v.id === pickedId) ?? vehicles[0] ?? null;

  // Anything typed for the current customer wins over the prefill.
  const typed = edits.customerId === customerId ? edits : { customerId };
  const vehicleTouched =
    typed.vehicleType !== undefined ||
    typed.vehicleName !== undefined ||
    typed.registrationNumber !== undefined;
  const vehicleType = typed.vehicleType ?? prefill?.vehicleType ?? "CAR";
  const vehicleName = typed.vehicleName ?? prefill?.vehicleName ?? "";
  const registrationNumber = typed.registrationNumber ?? prefill?.registrationNumber ?? "";

  const Spot = VEHICLE_SPOT[(vehicleType as keyof typeof VEHICLE_SPOT) ?? "OTHER"] ?? VEHICLE_SPOT.OTHER;

  const editVehicle = (patch: Omit<VehicleEdits, "customerId">) => {
    setJobError(null);
    setEdits((prev) => ({
      ...(prev.customerId === customerId ? prev : {}),
      customerId,
      ...patch,
    }));
  };

  const selectCustomer = (id: string, customer?: any) => {
    setCustomerId(id);
    setChosen(customer ?? null);
    setLockedCustomer(Boolean(id));
    setEdits({ customerId: id });
    setPicked(null);
    setJobError(null);
  };

  const createCustomer = useMutation({
    mutationFn: () =>
      api("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: customerName, phone: customerPhone }),
      }),
    onSuccess: (c: any) => {
      selectCustomer(c.id, c);
      setShowNewCustomer(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerError(null);
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created");
    },
    onError: (err) => setCustomerError(err),
  });

  const customerDuplicate =
    customerError instanceof ApiClientError && customerError.code === "DUPLICATE";

  /**
   * `seed` is whatever was typed into the search that found nobody — digits
   * are a phone number, anything else is a name. Re-typing it to add the
   * person is the kind of small tax that makes people skip the search.
   */
  const openNewCustomer = (seed?: string) => {
    setCustomerError(null);
    const text = seed?.trim();
    if (text) {
      if (/^[\d\s+()-]+$/.test(text)) setCustomerPhone(text);
      else setCustomerName(text);
    }
    setShowNewCustomer(true);
  };

  const closeNewCustomer = () => {
    setCustomerError(null);
    setShowNewCustomer(false);
  };

  const createJob = useMutation({
    mutationFn: () =>
      api("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          // An untouched prefill is that exact vehicle; edited fields fall back
          // to the registration-number dedupe on the server.
          vehicleId: prefill && !vehicleTouched ? prefill.id : undefined,
          vehicleType,
          vehicleName: vehicleName || undefined,
          registrationNumber: registrationNumber || undefined,
          complaint: complaint || undefined,
        }),
      }),
    onSuccess: (job: any) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["vehicles", customerId] });
      toast.success(`Job ${job.jobNumber} created`);
      router.push(`/jobs/${job.id}`);
    },
    onError: (err) => setJobError(err),
  });

  // The customer record went away between picking it and submitting — the way
  // out is choosing someone else, not pressing Create again.
  const customerGone = jobError instanceof ApiClientError && jobError.status === 404;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setJobError(null);
    if (!customerId) {
      // Same surface as a server failure: the form the operator is looking at.
      setJobError(new Error("Pick a customer, or add a new one, before opening the job."));
      return;
    }
    createJob.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* ── Customer ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Customer"
          icon={<User size={18} />}
          action={
            !showNewCustomer && !lockedCustomer ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => openNewCustomer()}>
                <UserPlus size={14} /> New customer
              </Button>
            ) : undefined
          }
        />

        {lockedCustomer && customerId ? (
          <Tile tone="sage" className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-control)] bg-[var(--surface-bright)] text-[var(--forest)]"
              >
                <User size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">
                  {selectedCustomer?.name ?? "Selected customer"}
                </p>
                <p className="truncate text-xs font-semibold text-[var(--forest)]/70">
                  {selectedCustomer?.phone ?? "Loading details…"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setLockedCustomer(false)}
            >
              Change
            </Button>
          </Tile>
        ) : showNewCustomer ? (
          <Tile tone="cream" className="space-y-3">
            <Field label="Name">
              <Input
                placeholder="e.g. Ramesh Sharma"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setCustomerError(null);
                }}
              />
            </Field>
            <Field label="Phone">
              <Input
                placeholder="e.g. 98300 12345"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  setCustomerError(null);
                }}
                inputMode="tel"
              />
            </Field>
            {customerError != null && (
              <InlineError
                message={
                  customerDuplicate
                    ? "Someone with these details is already in the registry. Cancel and pick them from the list."
                    : errorMessage(customerError)
                }
                reference={errorReference(customerError)}
              />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => createCustomer.mutate()}
                disabled={!customerName || !customerPhone || createCustomer.isPending}
              >
                {createCustomer.isPending ? "Saving…" : "Save customer"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={closeNewCustomer}>
                Cancel
              </Button>
            </div>
          </Tile>
        ) : customersFailed ? (
          /* Without this the picker is just empty, which reads as "you have no
             customers" rather than "the list did not load". */
          <div className="space-y-2.5">
            <InlineError
              message={errorMessage(customersError)}
              reference={errorReference(customersError)}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => refetchCustomers()}>
                Try again
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => openNewCustomer()}>
                <UserPlus size={14} /> New customer
              </Button>
            </div>
          </div>
        ) : (
          /* The registry is looked up by typing, not scrolled: the matches
             drop down under the box and that panel scrolls, so the form
             underneath keeps its place instead of being pushed down the page
             by a list of results. */
          <SearchSelect
            query={customerQ}
            onQueryChange={(text) => setCustomerQ(text)}
            options={(customers ?? []).map((c: any) => {
              const owed = Number(c.outstanding ?? 0);
              const visits = Number(c.totalJobs ?? 0);
              return {
                id: c.id,
                label: c.name,
                sublabel: `${c.phone}${visits > 0 ? ` · ${visits} ${visits === 1 ? "job" : "jobs"}` : ""}`,
                icon: <User size={15} />,
                meta:
                  owed > 0 ? (
                    <>
                      <span className="tile-label block text-[var(--ink-label)]">Due</span>
                      <span className="numeral text-sm text-[var(--terracotta)]">
                        {currency(owed)}
                      </span>
                    </>
                  ) : undefined,
                raw: c,
              };
            })}
            value={customerId}
            onSelect={(option) => selectCustomer(option.id, (option as any).raw)}
            placeholder="Search by name or phone"
            aria-label="Search customers"
            loading={customersPending}
            busy={customersFetching}
            empty={
              <div className="space-y-2.5 text-center">
                <p className="text-sm font-extrabold text-[var(--ink)]">
                  {customerSearch ? `Nobody matches “${customerSearch}”` : "No customers yet"}
                </p>
                <p className="text-xs font-semibold text-[var(--ink-muted)]">
                  {customerSearch
                    ? "Check the spelling or the number — or add them to the registry now."
                    : "Add the first customer to open a job card for them."}
                </p>
                <Button type="button" size="sm" onClick={() => openNewCustomer(customerSearch)}>
                  <UserPlus size={14} />
                  {customerSearch ? `Add “${customerSearch}”` : "New customer"}
                </Button>
              </div>
            }
          />
        )}
      </section>

      {/* ── Vehicle ──────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Vehicle" icon={<Car size={18} />} />

        <div className="space-y-3">
          {prefill && (
            <Tile tone="ochre" className="flex items-start gap-2.5 p-3.5">
              <Sparkles size={16} className="mt-px shrink-0" />
              <p className="text-xs font-bold leading-relaxed">
                Autofilled from the last visit — edit any field if this is a different vehicle.
              </p>
            </Tile>
          )}

          <Tile tone="bright" className="flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[var(--r-control)] bg-[var(--surface-sunk)]"
            >
              <Spot size={50} />
            </span>
            <div className="min-w-0">
              <p className="tile-label text-[var(--ink-label)]">On the ramp</p>
              <p className="mt-1 truncate text-sm font-extrabold text-[var(--ink)]">
                {vehicleName || vehicleTypeLabel(vehicleType)}
              </p>
              <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                {registrationNumber || "No registration yet"}
              </p>
            </div>
          </Tile>

          {vehicles.length > 1 && (
            <Field label="Previous vehicles">
              <AnimatedDropdown
                options={vehicles.map((v: any) => ({
                  id: v.id,
                  name: `${vehicleTypeLabel(v.vehicleType)} · ${
                    v.registrationNumber || v.vehicleName || "No registration"
                  }`,
                }))}
                value={prefill?.id ?? ""}
                onChange={(vehicleId) => {
                  setPicked({ customerId, id: vehicleId });
                  setEdits({ customerId });
                }}
                placeholder="Pick a vehicle..."
              />
            </Field>
          )}

          <Field label="Vehicle type">
            <AnimatedDropdown
              options={VEHICLE_TYPES.map((t) => ({
                id: t,
                name: vehicleTypeLabel(t),
              }))}
              value={vehicleType}
              onChange={(t) => editVehicle({ vehicleType: t })}
              placeholder="Select vehicle type..."
            />
          </Field>

          <Field label="Vehicle name / model (optional)">
            <Input
              value={vehicleName}
              onChange={(e) => editVehicle({ vehicleName: e.target.value })}
              placeholder="e.g. Swift / Activa"
            />
          </Field>

          <Field
            label="Registration number (optional)"
            hint={
              prefill && vehicleTouched
                ? "A changed registration number is saved as a different vehicle."
                : undefined
            }
          >
            <Input
              value={registrationNumber}
              onChange={(e) => editVehicle({ registrationNumber: e.target.value })}
              placeholder="e.g. WB 12 AB 3456"
            />
          </Field>
        </div>
      </section>

      {/* ── Work ─────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Complaint" icon={<Plus size={18} />} />
        <Field label="What has the customer reported?">
          <Textarea
            value={complaint}
            onChange={(e) => {
              setComplaint(e.target.value);
              setJobError(null);
            }}
            placeholder="e.g. Brake noise at low speed, engine oil change due"
            rows={3}
          />
        </Field>
      </section>

      {jobError != null && (
        <div className="space-y-2.5">
          <InlineError message={errorMessage(jobError)} reference={errorReference(jobError)} />
          {customerGone && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectCustomer("")}
            >
              Choose another customer
            </Button>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={createJob.isPending}>
        <Plus size={18} />
        {createJob.isPending ? "Creating job…" : "Create job"}
      </Button>
    </form>
  );
}
