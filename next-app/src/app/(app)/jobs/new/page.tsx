"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Field, Textarea, Card } from "@/components/ui";
import { AnimatedDropdown } from "@/components/animated-dropdown";
import { VEHICLE_TYPES, vehicleTypeLabel } from "@/lib/format";

export default function NewJobPage() {
  const router = useRouter();

  const [customerId, setCustomerId] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("CAR");
  const [vehicleName, setVehicleName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [complaint, setComplaint] = useState("");

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api<any[]>("/api/customers"),
  });

  const createCustomer = useMutation({
    mutationFn: () =>
      api("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: customerName, phone: customerPhone }),
      }),
    onSuccess: (c: any) => {
      setCustomerId(c.id);
      setShowNewCustomer(false);
      setCustomerName("");
      setCustomerPhone("");
      toast.success("Customer created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createJob = useMutation({
    mutationFn: () =>
      api("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          vehicleType,
          vehicleName: vehicleName || undefined,
          registrationNumber: registrationNumber || undefined,
          complaint: complaint || undefined,
        }),
      }),
    onSuccess: (job: any) => {
      toast.success(`Job ${job.jobNumber} created`);
      router.push(`/jobs/${job.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error("Select or create a customer");
      return;
    }
    createJob.mutate();
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">New Job</h1>
      </div>

      <Card className="space-y-4 p-5">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Customer</span>
              {!showNewCustomer && (
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(true)}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                >
                  <UserPlus size={14} /> New
                </button>
              )}
            </div>
            {showNewCustomer ? (
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <Input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  inputMode="tel"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => createCustomer.mutate()}
                    disabled={!customerName || !customerPhone || createCustomer.isPending}
                  >
                    Save customer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewCustomer(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <AnimatedDropdown
                options={(customers ?? []).map((c) => ({
                  id: c.id,
                  name: `${c.name} (${c.phone})`,
                }))}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Select customer..."
              />
            )}
          </div>

          <Field label="Vehicle Type">
            <AnimatedDropdown
              options={VEHICLE_TYPES.map((t) => ({
                id: t,
                name: vehicleTypeLabel(t),
              }))}
              value={vehicleType}
              onChange={setVehicleType}
              placeholder="Select vehicle type..."
            />
          </Field>

          <Field label="Vehicle Name / Model (optional)">
            <Input
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              placeholder="e.g. Swift / Activa"
            />
          </Field>

          <Field label="Registration Number (optional)">
            <Input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. WB 12 AB 3456"
            />
          </Field>

          <Field label="Complaint / Work">
            <Textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g. Brake noise, engine oil change…"
              rows={2}
            />
          </Field>

          <Button type="submit" className="w-full" size="lg" disabled={createJob.isPending}>
            <Plus size={18} />
            {createJob.isPending ? "Creating..." : "Create Job"}
          </Button>
        </form>
      </Card>
    </div>
  );
}