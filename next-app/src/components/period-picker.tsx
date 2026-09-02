"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Field, Input, Sheet } from "@/components/ui";
import { formatDateRange } from "@/lib/format";
import {
  PRESETS,
  parseRange,
  resolveMonth,
  resolvePreset,
  resolveYear,
  toDayString,
  type DateRange,
  type PresetId,
} from "@/lib/date-range";
import { cn } from "@/lib/cn";

/** What the trigger says, and what the caller stores to redraw it. */
export type PeriodSelection =
  | { kind: "preset"; preset: PresetId }
  | { kind: "month"; year: number; month: number }
  | { kind: "year"; year: number }
  | { kind: "custom"; from: string; to: string };

export function rangeOf(sel: PeriodSelection): DateRange {
  switch (sel.kind) {
    case "preset":
      return resolvePreset(sel.preset);
    case "month":
      return resolveMonth(sel.year, sel.month);
    case "year":
      return resolveYear(sel.year);
    case "custom":
      // The caller only ever stores a pair that already parsed; the fallback
      // keeps this total rather than throwing at render time.
      return parseRange(sel.from, sel.to) ?? resolvePreset("today");
  }
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function labelOf(sel: PeriodSelection): string {
  switch (sel.kind) {
    case "preset":
      return PRESETS.find((p) => p.id === sel.preset)?.label ?? "Today";
    case "month":
      return `${MONTHS[sel.month]} ${sel.year}`;
    case "year":
      return String(sel.year);
    case "custom":
      return "Custom range";
  }
}

/**
 * The one control that decides what a report covers.
 *
 * It replaces four tabs — Today / Week / Month / Year — which could only ever
 * mean the *current* one of each. "Month" could not mean July, "Year" could
 * not mean 2025, and no combination of them could mean 10–20 August. Four tabs
 * also stop scaling the moment a fifth option is wanted; a trigger plus a
 * sheet holds eight presets, a month grid, a year list and a custom range
 * without growing on the page at all.
 *
 * The resolved dates are printed under the trigger permanently, because the
 * label alone does not say what "Last week" actually covered.
 */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: PeriodSelection;
  onChange: (next: PeriodSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const range = rangeOf(value);

  // Sheet-local drafts, so backing out of the sheet changes nothing.
  const [tab, setTab] = useState<"presets" | "month" | "year" | "custom">("presets");
  const [gridYear, setGridYear] = useState(new Date().getFullYear());
  const [from, setFrom] = useState(toDayString(range.from));
  const [to, setTo] = useState(toDayString(range.to));
  const [customError, setCustomError] = useState<string | null>(null);

  const openSheet = () => {
    const current = rangeOf(value);
    setTab(
      value.kind === "custom"
        ? "custom"
        : value.kind === "month"
          ? "month"
          : value.kind === "year"
            ? "year"
            : "presets",
    );
    setGridYear(value.kind === "month" || value.kind === "year" ? value.year : current.from.getFullYear());
    setFrom(toDayString(current.from));
    setTo(toDayString(current.to));
    setCustomError(null);
    setOpen(true);
  };

  const commit = (next: PeriodSelection) => {
    onChange(next);
    setOpen(false);
  };

  const applyCustom = () => {
    const parsed = parseRange(from, to);
    if (!parsed) {
      setCustomError("Pick a start and an end date.");
      return;
    }
    // parseRange swaps a reversed pair, so store what it actually resolved
    // rather than what was typed — otherwise the trigger and the report would
    // describe the range in opposite orders.
    commit({ kind: "custom", from: toDayString(parsed.from), to: toDayString(parsed.to) });
  };

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);

  const TABS = [
    { id: "presets", label: "Quick" },
    { id: "month", label: "Month" },
    { id: "year", label: "Year" },
    { id: "custom", label: "Custom" },
  ] as const;

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={cn(
          "flex w-full min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--r-control)] border px-4",
          "border-[var(--hairline-strong)] bg-[var(--surface-bright)] text-left",
          "transition-[border-color,background-color] duration-150 ease-out hover:bg-[var(--surface)]",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <CalendarDays size={16} className="shrink-0 text-[var(--ink-label)]" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-[var(--ink)]">
              {labelOf(value)}
            </span>
            {/* The dates, always. "Last week" does not say which week. */}
            <span className="block truncate text-[11px] font-semibold text-[var(--ink-muted)]">
              {formatDateRange(range.from, range.to)}
            </span>
          </span>
        </span>
        <ChevronDown size={16} className="shrink-0 text-[var(--ink-label)]" aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Report period">
        <div className="space-y-4">
          <div className="flex select-none rounded-full bg-[var(--surface-sunk)] p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={cn(
                  "flex-1 cursor-pointer rounded-full px-2 py-2 text-xs font-extrabold",
                  "transition-[background-color,color] duration-150 ease-out",
                  tab === t.id
                    ? "bg-[var(--forest)] text-[var(--ink-on-dark)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "presets" && (
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const active = value.kind === "preset" && value.preset === p.id;
                const r = resolvePreset(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => commit({ kind: "preset", preset: p.id })}
                    aria-pressed={active}
                    className={cn(
                      "flex cursor-pointer flex-col gap-0.5 rounded-[var(--r-tile)] border p-3 text-left",
                      "transition-[background-color,border-color] duration-150 ease-out",
                      active
                        ? "border-[var(--forest)] bg-[var(--sage)]"
                        : "border-[var(--hairline)] bg-[var(--surface)] hover:bg-[var(--surface-sunk)]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-extrabold",
                        active ? "text-[var(--forest)]" : "text-[var(--ink)]",
                      )}
                    >
                      {p.label}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--ink-muted)]">
                      {formatDateRange(r.from, r.to)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "month" && (
            <div className="space-y-3">
              <YearStepper year={gridYear} onChange={setGridYear} />
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m, i) => {
                  const active =
                    value.kind === "month" && value.year === gridYear && value.month === i;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => commit({ kind: "month", year: gridYear, month: i })}
                      aria-pressed={active}
                      className={cn(
                        "min-h-11 cursor-pointer rounded-[var(--r-tile)] border text-xs font-extrabold",
                        "transition-[background-color,border-color] duration-150 ease-out",
                        active
                          ? "border-[var(--forest)] bg-[var(--forest)] text-[var(--ink-on-dark)]"
                          : "border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-sunk)]",
                      )}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "year" && (
            <div className="space-y-1.5">
              {years.map((y) => {
                const active = value.kind === "year" && value.year === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => commit({ kind: "year", year: y })}
                    aria-pressed={active}
                    className={cn(
                      "flex min-h-11 w-full cursor-pointer items-center justify-between rounded-[var(--r-tile)] px-3.5",
                      "text-sm font-extrabold transition-[background-color] duration-150 ease-out",
                      active
                        ? "bg-[var(--sage)] text-[var(--forest)]"
                        : "text-[var(--ink)] hover:bg-[var(--surface-sunk)]",
                    )}
                  >
                    {y}
                    {active && <Check size={15} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          )}

          {tab === "custom" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  <Input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setCustomError(null);
                    }}
                  />
                </Field>
                <Field label="To">
                  <Input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setCustomError(null);
                    }}
                  />
                </Field>
              </div>
              {customError && (
                <p className="text-xs font-semibold text-[var(--terracotta-hover)]">{customError}</p>
              )}
              <Button className="w-full" size="lg" onClick={applyCustom}>
                Apply
              </Button>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}

function YearStepper({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  const step =
    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--surface-sunk)] " +
    "text-[var(--ink)] transition-colors duration-150 ease-out hover:bg-[var(--hairline)]";
  return (
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={() => onChange(year - 1)} aria-label="Previous year" className={step}>
        <ChevronLeft size={16} />
      </button>
      <span className="numeral text-base text-[var(--ink)]">{year}</span>
      <button type="button" onClick={() => onChange(year + 1)} aria-label="Next year" className={step}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
