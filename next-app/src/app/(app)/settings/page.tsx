"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Check, FileText, Receipt, RotateCcw } from "lucide-react";
import { api, errorMessage, errorReference } from "@/lib/api";
import {
  Button,
  Card,
  ErrorState,
  Field,
  InlineError,
  Input,
  Panel,
  SectionHeader,
  Skeleton,
  Textarea,
} from "@/components/ui";

const KEYS = [
  "businessName",
  "businessPhone",
  "businessAddress",
  "invoicePrefix",
  "invoiceTerms",
] as const;

type SettingKey = (typeof KEYS)[number];

/** What the form shows when the workshop hasn't filled a field in yet. */
const FALLBACK: Record<SettingKey, string> = {
  businessName: "",
  businessPhone: "",
  businessAddress: "",
  invoicePrefix: "INV",
  invoiceTerms: "",
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Partial<Record<SettingKey, string>>>({});
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<{ message: string; reference?: string } | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<any>("/api/settings"),
  });

  const saved = (key: SettingKey): string => data?.[key] ?? FALLBACK[key];

  const value = (key: SettingKey): string => {
    if (edits[key] !== undefined) return edits[key] as string;
    return saved(key);
  };

  const set = (key: SettingKey, v: string) => {
    setJustSaved(false);
    // Editing anything is an attempt to fix the failed save.
    setSaveError(null);
    setEdits((prev) => ({ ...prev, [key]: v }));
  };

  const changed = KEYS.filter((key) => edits[key] !== undefined && edits[key] !== saved(key));
  const dirty = changed.length > 0;

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = {};
      for (const key of KEYS) body[key] = value(key);
      return api("/api/settings", { method: "PATCH", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      // A routine save is a toast — never a celebration panel.
      toast.success("Settings saved");
      setEdits({});
      setJustSaved(true);
      setSaveError(null);
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    // The form and its unsaved changes are still on screen, so the failure
    // stays with them rather than sliding away in a toast.
    onError: (err) =>
      setSaveError({ message: errorMessage(err), reference: errorReference(err) }),
  });

  // The "saved" acknowledgement in the action bar is a moment, not a mode.
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 4000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const header = (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-[var(--ink)]">Settings</h1>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        Your workshop&apos;s details and the defaults every new invoice starts from.
      </p>
    </div>
  );

  if (isError) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState
          title="Couldn't load your settings"
          message={errorMessage(error)}
          reference={errorReference(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  const prefix = value("invoicePrefix").trim() || "INV";
  const businessName = value("businessName").trim();
  const businessPhone = value("businessPhone").trim();
  const businessAddress = value("businessAddress").trim();
  const invoiceTerms = value("invoiceTerms").trim();

  return (
    <div className="space-y-5">
      {header}

      {/* The one hero on this page: what the customer actually ends up seeing. */}
      <Panel title="On every invoice you print" icon={<Receipt size={17} />}>
        <div className="rounded-[var(--r-tile)] bg-[var(--forest-deep)] p-4">
          <p className="text-base font-extrabold leading-tight text-[var(--ink-on-dark)]">
            {businessName || "Add your workshop name"}
          </p>
          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[var(--ink-on-dark-muted)]">
            {businessAddress || "Add your address so customers can find you"}
          </p>
          <div className="mt-3 flex items-end justify-between gap-3 border-t border-[var(--ink-on-dark)]/12 pt-3">
            <div className="min-w-0">
              <span className="tile-label text-[var(--ink-on-dark-muted)]">Phone</span>
              <p className="truncate text-sm font-bold text-[var(--ink-on-dark)]">
                {businessPhone || "Not set"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="tile-label text-[var(--ink-on-dark-muted)]">Next number</span>
              <p className="tabular text-sm font-extrabold text-[var(--ink-on-dark)]">
                {prefix}-0001
              </p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--ink-on-dark-muted)]">
          {invoiceTerms
            ? `Terms printed at the foot: “${invoiceTerms.slice(0, 90)}${invoiceTerms.length > 90 ? "…" : ""}”`
            : "No payment terms set — invoices will print without a terms line."}
        </p>
      </Panel>

      <Card className="p-5">
        <SectionHeader title="Business identity" icon={<Building2 size={17} />} />
        <p className="-mt-1 mb-4 text-xs leading-relaxed text-[var(--ink-muted)]">
          Used at the top of every invoice and job sheet. Customers see all of it.
        </p>
        <div className="space-y-4">
          <Field label="Workshop name" hint="The trading name customers know you by.">
            <Input
              value={value("businessName")}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="Sharma Auto Works"
              autoComplete="organization"
            />
          </Field>
          <Field label="Contact phone" hint="Printed on invoices so customers can call about a job.">
            <Input
              value={value("businessPhone")}
              onChange={(e) => set("businessPhone", e.target.value)}
              inputMode="tel"
              placeholder="+91 98765 43210"
              autoComplete="tel"
            />
          </Field>
          <Field label="Address">
            <Textarea
              value={value("businessAddress")}
              onChange={(e) => set("businessAddress", e.target.value)}
              rows={3}
              placeholder={"12 Station Road\nAndheri East, Mumbai 400069"}
              autoComplete="street-address"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Invoice defaults" icon={<FileText size={17} />} />
        <p className="-mt-1 mb-4 text-xs leading-relaxed text-[var(--ink-muted)]">
          Applied to invoices you raise from here on. Existing invoices keep the
          numbers and terms they were issued with.
        </p>
        <div className="space-y-4">
          <Field
            label="Invoice prefix"
            hint={`Numbers run as ${prefix}-0001, ${prefix}-0002, and so on.`}
          >
            <Input
              value={value("invoicePrefix")}
              onChange={(e) => set("invoicePrefix", e.target.value)}
              placeholder="INV"
              className="sm:max-w-40"
            />
          </Field>
          <Field
            label="Payment terms"
            hint="Printed at the foot of the invoice. Keep it to a sentence or two."
          >
            <Textarea
              value={value("invoiceTerms")}
              onChange={(e) => set("invoiceTerms", e.target.value)}
              rows={3}
              placeholder="Payment due on collection. Parts carry a 6-month warranty against defects."
            />
          </Field>
        </div>
      </Card>

      {/* One save affordance, with every state designed: idle, dirty,
          pending and just-saved. There is no bottom nav to clear any more, so
          it sticks to the viewport edge — the padding below the card is what
          keeps it off that edge, and it absorbs the safe-area inset. */}
      <div className="sticky bottom-0 z-30 -mx-1 space-y-2 pt-2 pb-[calc(var(--nav-inset)+0.75rem)]">
        {saveError && (
          <InlineError
            message={saveError.message}
            reference={saveError.reference}
            className="bg-[var(--surface-bright)] shadow-[var(--lift-2)]"
          />
        )}
        <div className="flex items-center gap-3 rounded-[var(--r-card)] border border-[var(--hairline-strong)] bg-[var(--surface-bright)] p-3 shadow-[var(--lift-2)]">
          <p className="min-w-0 flex-1 text-xs font-bold leading-tight text-[var(--ink-muted)]">
            {dirty ? (
              <span className="text-[var(--ink)]">
                {changed.length} unsaved {changed.length === 1 ? "change" : "changes"}
              </span>
            ) : justSaved ? (
              <span className="inline-flex items-center gap-1.5 text-[var(--forest)]">
                <Check size={14} /> Saved — new invoices will use these details.
              </span>
            ) : (
              "Everything here is saved."
            )}
          </p>
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEdits({})}
              disabled={save.isPending}
              className="shrink-0"
            >
              <RotateCcw size={14} />
              Discard
            </Button>
          )}
          <Button
            size="md"
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            className="shrink-0"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Mirrors the real page: title block, preview panel, two field cards. */
function SettingsSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading your workshop settings…</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-4 w-72 rounded-full" />
      </div>
      <Skeleton className="h-52 rounded-[var(--r-panel)]" />
      <Skeleton className="h-[340px] rounded-[var(--r-card)]" />
      <Skeleton className="h-[280px] rounded-[var(--r-card)]" />
    </div>
  );
}
