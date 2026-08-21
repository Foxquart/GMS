"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, Building2, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, Field, Textarea, Card, Skeleton, ErrorState } from "@/components/ui";

const KEYS = [
  "businessName",
  "businessPhone",
  "businessAddress",
  "invoicePrefix",
  "invoiceTerms",
] as const;

export default function SettingsPage() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Partial<Record<(typeof KEYS)[number], string>>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<any>("/api/settings"),
  });

  const value = (key: (typeof KEYS)[number]) => {
    if (edits[key] !== undefined) return edits[key];
    if (key === "invoicePrefix") return data?.invoicePrefix ?? "INV";
    return data?.[key] ?? "";
  };

  const set = (key: (typeof KEYS)[number], v: string) =>
    setEdits((prev) => ({ ...prev, [key]: v }));

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = {};
      for (const key of KEYS) body[key] = value(key);
      return api("/api/settings", { method: "PATCH", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      toast.success("Settings saved");
      setEdits({});
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isError) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="h-8 w-40" />
        <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="border-b border-[#e2e8f0]/50 pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0f172a]">
          <Settings size={24} className="text-[#5865f2]" /> Workshop Settings
        </h1>
        <p className="text-xs font-semibold text-[#64748b]">Configure business profile and invoice settings</p>
      </div>

      <Card className="space-y-5 p-6 border-[#e2e8f0] bg-white">
        <div className="flex items-center gap-3 border-b border-[#e2e8f0] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865f2]/15 text-[#5865f2] border border-[#5865f2]/30">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a]">Business Profile</h2>
            <p className="text-xs text-[#64748b]">Your garage information displayed on invoices</p>
          </div>
        </div>

        <Field label="Business Name">
          <Input value={value("businessName")} onChange={(e) => set("businessName", e.target.value)} placeholder="e.g. SpeedCare Motors" />
        </Field>
        <Field label="Contact Phone">
          <Input value={value("businessPhone")} onChange={(e) => set("businessPhone", e.target.value)} inputMode="tel" placeholder="e.g. +91 98765 43210" />
        </Field>
        <Field label="Address">
          <Textarea value={value("businessAddress")} onChange={(e) => set("businessAddress", e.target.value)} rows={2} placeholder="Full garage address" />
        </Field>

        <div className="border-t border-[#e2e8f0] pt-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16a34a]/10 text-[#15803d] border border-[#16a34a]/25">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0f172a]">Invoice Settings</h2>
              <p className="text-xs text-[#64748b]">Customize invoice prefixes and default payment terms</p>
            </div>
          </div>
          <Field label="Invoice Prefix">
            <Input value={value("invoicePrefix")} onChange={(e) => set("invoicePrefix", e.target.value)} placeholder="INV" />
          </Field>
        </div>

        <Field label="Invoice Terms & Conditions">
          <Textarea value={value("invoiceTerms")} onChange={(e) => set("invoiceTerms", e.target.value)} rows={3} placeholder="Terms & conditions printed on customer invoices" />
        </Field>

        <Button className="w-full h-11 text-base font-bold" size="lg" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </Card>
    </div>
  );
}