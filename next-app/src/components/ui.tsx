"use client";

import { forwardRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { SpotClipboard, SpotCone, SpotGear, SpotStamp } from "@/components/illustrations";

/* ─────────────────────────────────────────────────────────────────────
   Primitives for the warm workshop system.

   Elevation language: hairline borders carry structure, shadows are
   reserved for things that genuinely float (Sheet, nav pill, dropdown).
   Nothing stacks a border, a shadow and a background shift at once.
   ───────────────────────────────────────────────────────────────────── */

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
    size?: "sm" | "md" | "lg" | "icon";
  }
>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-bold",
        "transition-[background-color,color,border-color,scale] duration-150 ease-out",
        "active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none",
        size === "sm" && "h-8 px-3.5 text-xs",
        size === "md" && "h-10 px-5 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        size === "icon" && "h-10 w-10 p-0",
        variant === "primary" && "bg-[var(--forest)] text-[var(--ink-on-dark)] hover:bg-[var(--forest-hover)]",
        variant === "secondary" && "bg-[var(--sage)] text-[var(--forest)] hover:bg-[var(--sage-deep)]",
        variant === "outline" &&
          "border border-[var(--hairline-strong)] bg-[var(--surface-bright)] text-[var(--ink)] hover:bg-[var(--surface-sunk)]",
        variant === "ghost" && "text-[var(--ink-muted)] hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]",
        variant === "danger" && "bg-[var(--terracotta)] text-[#fdf6f2] hover:bg-[var(--terracotta-hover)]",
        variant === "success" && "bg-[var(--forest)] text-[var(--ink-on-dark)] hover:bg-[var(--forest-hover)]",
        className,
      )}
      {...props}
    />
  );
});

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-[var(--r-control)] border border-[var(--hairline-strong)] bg-[var(--surface-bright)] px-4",
          "text-sm text-[var(--ink)] placeholder:text-[var(--ink-label)]",
          "transition-[border-color,background-color] duration-150 ease-out",
          "focus:outline-none focus:border-[var(--forest)] disabled:opacity-45",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "h-11 w-full appearance-none rounded-[var(--r-control)] border border-[var(--hairline-strong)] bg-[var(--surface-bright)] pl-4 pr-10",
            "text-sm text-[var(--ink)] cursor-pointer",
            "transition-[border-color] duration-150 ease-out focus:outline-none focus:border-[var(--forest)] disabled:opacity-45",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-label)]"
          size={16}
        />
      </div>
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-[var(--r-control)] border border-[var(--hairline-strong)] bg-[var(--surface-bright)] px-4 py-3",
        "text-sm leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-label)]",
        "transition-[border-color] duration-150 ease-out focus:outline-none focus:border-[var(--forest)] disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
});

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4 text-[var(--ink)]",
      "transition-[border-color,translate,scale] duration-150 ease-out",
      className,
    )}
    {...props}
  />
);

/* ── Tone system ──────────────────────────────────────────────────────
   One vocabulary of fills shared by Tile, StatTile and SpecTile, so a
   "terracotta" thing looks the same wherever it appears.
   ─────────────────────────────────────────────────────────────────── */
export type Tone = "cream" | "bright" | "sage" | "forest" | "terracotta" | "ochre";

const TONE_FILL: Record<Tone, string> = {
  cream: "bg-[var(--surface)] border border-[var(--hairline)]",
  bright: "bg-[var(--surface-bright)] border border-[var(--hairline)]",
  sage: "bg-[var(--sage)]",
  forest: "bg-[var(--forest)]",
  terracotta: "bg-[var(--terracotta)]",
  ochre: "bg-[var(--ochre)]",
};

const TONE_INK: Record<Tone, string> = {
  cream: "text-[var(--ink)]",
  bright: "text-[var(--ink)]",
  sage: "text-[var(--forest)]",
  forest: "text-[var(--ink-on-dark)]",
  terracotta: "text-[#fdf6f2]",
  ochre: "text-[var(--forest-deep)]",
};

/**
 * The caption tier for each fill.
 *
 * On the coloured fills this used to be the body ink at 65–75% opacity, which
 * measured 3.5–3.6:1 against the fill underneath — below the 4.5:1 that 10px
 * caps and 11px footnotes need. There is no muted ink to reach for on a solid
 * accent, so on those tones the caption runs at full strength and the tier is
 * carried by size and letterspacing instead. Sage is pale enough to keep a
 * little transparency and still clear the bar at 80%.
 */
const TONE_LABEL: Record<Tone, string> = {
  cream: "text-[var(--ink-label)]",
  bright: "text-[var(--ink-label)]",
  sage: "text-[var(--forest)]/80",
  forest: "text-[var(--ink-on-dark-muted)]",
  terracotta: "text-[#fdf6f2]",
  ochre: "text-[var(--forest-deep)]",
};

/** A colour-blocked tile — the basic building block of every bento grid. */
export const Tile = ({
  tone = "cream",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: Tone }) => (
  <div
    className={cn(
      "relative isolate overflow-hidden rounded-[var(--r-tile)] p-4",
      TONE_FILL[tone],
      TONE_INK[tone],
      className,
    )}
    {...props}
  />
);

/**
 * Tiny caps label over a large numeral — the figure is the hero, the label
 * is a whisper. `value` stays on one line; long values shrink rather than wrap.
 *
 * `size="sm"` is the same tile with every dimension pulled in — smaller
 * numeral, tighter padding, quieter footnote. It exists for grids that carry
 * enough tiles that the default numeral would push the last row off the fold;
 * the dashboard uses it so eight figures fit where five used to.
 *
 * The figure never wraps. It used to be allowed to, on tall tiles, on the
 * theory that two lines beat truncation — but a number broken across lines
 * reads as two numbers ("₹1,72," over "000.00"), which is worse than either.
 * Hand the value through `currencyFit` with this tile's width budget and it
 * arrives already short enough to fit on one.
 */
export const StatTile = ({
  label,
  value,
  unit,
  footnote,
  icon,
  tone = "cream",
  size = "md",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: React.ReactNode;
  unit?: string;
  footnote?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  size?: "md" | "sm";
}) => {
  const sm = size === "sm";
  return (
    <Tile
      tone={tone}
      className={cn("flex flex-col justify-between", sm ? "gap-2 p-3" : "gap-3", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        {/* 10px is the floor for anything carrying meaning. This was 9px on
            the small tiles, which is where a caps label stops being readable
            at arm's length on a workbench — and every label on this grid names
            the figure under it, so none of them are decoration. */}
        <span className={cn("tile-label", sm && "text-[10px] tracking-[0.1em]", TONE_LABEL[tone])}>
          {label}
        </span>
        {icon && <span className={cn("shrink-0 opacity-45", TONE_INK[tone])}>{icon}</span>}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "numeral truncate",
              sm ? "text-[clamp(1.25rem,5vw,1.75rem)]" : "text-[clamp(1.75rem,7vw,2.5rem)]",
            )}
          >
            {value}
          </span>
          {unit && (
            <span className={cn(sm ? "text-[10px]" : "text-[11px]", "font-bold", TONE_LABEL[tone])}>
              {unit}
            </span>
          )}
        </div>
        {footnote && (
          <p
            className={cn(
              "font-semibold leading-tight",
              sm ? "mt-0.5 text-[11px]" : "mt-1 text-xs",
              TONE_LABEL[tone],
            )}
          >
            {footnote}
          </p>
        )}
      </div>
    </Tile>
  );
};

/** Small fact tile: icon, caps label, bold value. Used in detail-page grids. */
export const SpecTile = ({
  label,
  value,
  icon,
  tone = "bright",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
}) => (
  <Tile tone={tone} className={cn("flex flex-col items-center gap-1.5 p-3 text-center", className)} {...props}>
    {icon && <span className={cn("mb-0.5", TONE_INK[tone])}>{icon}</span>}
    <span className={cn("tile-label", TONE_LABEL[tone])}>{label}</span>
    <span className="text-sm font-extrabold leading-tight">{value}</span>
  </Tile>
);

/**
 * Full-bleed coloured hero for detail pages: floating circular controls,
 * an oversized title, and room for a supporting line.
 */
export const HeroPanel = ({
  title,
  subtitle,
  eyebrow,
  leading,
  trailing,
  tone = "terracotta",
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  tone?: Tone;
  className?: string;
  children?: React.ReactNode;
}) => (
  <section
    className={cn(
      "relative isolate overflow-hidden rounded-[var(--r-panel)] p-5 sm:p-6",
      TONE_FILL[tone],
      TONE_INK[tone],
      className,
    )}
  >
    <div className="flex items-start justify-between gap-3">
      {leading}
      <div className="ml-auto flex items-center gap-2">{trailing}</div>
    </div>
    <div className="mt-4">
      {eyebrow && <p className={cn("tile-label mb-1.5", TONE_LABEL[tone])}>{eyebrow}</p>}
      <h1 className="text-[clamp(1.5rem,6vw,2.125rem)] font-extrabold leading-[1.1] tracking-tight text-balance">
        {title}
      </h1>
      {subtitle && (
        <p className={cn("mt-1.5 text-sm font-semibold", TONE_LABEL[tone])}>{subtitle}</p>
      )}
    </div>
    {children}
  </section>
);

/** Circular icon control that floats on a hero panel. */
export const CircleButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { onDark?: boolean }
>(function CircleButton({ className, onDark = true, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        "transition-[background-color,scale] duration-150 ease-out active:scale-90 cursor-pointer",
        onDark
          ? "bg-white/18 text-current hover:bg-white/28"
          : "bg-[var(--surface-sunk)] text-[var(--ink)] hover:bg-[var(--hairline)]",
        className,
      )}
      {...props}
    />
  );
});

/** Dark panel for procedural content — work notes, numbered steps, summaries. */
export const Panel = ({
  title,
  icon,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <section
    className={cn(
      "rounded-[var(--r-panel)] bg-[var(--forest)] p-5 text-[var(--ink-on-dark)]",
      className,
    )}
  >
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-extrabold">
          {icon}
          {title}
        </h2>
        {action}
      </div>
    )}
    {children}
  </section>
);

/** Numbered step row for use inside <Panel>. */
export const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <div className="flex gap-3 py-2">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--terracotta)] text-[11px] font-extrabold text-[#fdf6f2]">
      {n}
    </span>
    <p className="text-sm leading-relaxed text-[var(--ink-on-dark)]/90">{children}</p>
  </div>
);

/** Section heading with an optional trailing action. */
export const SectionHeader = ({
  title,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
    <h2 className="flex min-w-0 items-center gap-2 text-base font-extrabold text-[var(--ink)]">
      {icon}
      <span className="truncate">{title}</span>
    </h2>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/**
 * Pins a page's title and its filter controls to the top while the list
 * beneath scrolls, so only the rows move.
 *
 * A real inner scroll container would trap touch scrolling, break
 * pull-to-refresh and leave dead space under short lists — this gets the same
 * result using ordinary page scroll.
 *
 * `top-14` clears the mobile top bar; on lg there is no top bar, so it pins to
 * the top of the column. The negative margins let the background bleed to the
 * page gutters so rows do not show through at the edges as they pass under.
 */
export const StickyControls = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky top-14 z-20 -mx-4 bg-[var(--canvas)] px-4 pb-3 pt-3 lg:top-0 lg:-mx-8 lg:px-8",
      // A hairline only once something has scrolled under it would need a
      // scroll listener; a permanent one reads as a deliberate divider.
      "border-b border-[var(--hairline)]/70",
      className,
    )}
    {...props}
  />
);

/**
 * A condensed record header that appears only once the page's hero has
 * scrolled away, giving back the "back" control and the record's identity
 * without paying for them while the hero is still on screen.
 *
 * The outer rail is `h-0` and the bar is absolutely positioned inside it, so
 * this costs zero layout — no permanent 56px band on a phone. Callers drive
 * `shown` from an IntersectionObserver on their hero.
 */
export const RecordBar = ({
  shown,
  onBack,
  title,
  meta,
  trailing,
}: {
  shown: boolean;
  onBack: () => void;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
}) => (
  <div className="sticky top-14 z-20 -mx-4 mb-0 h-0 lg:top-0 lg:-mx-8">
    <div
      // Hidden means gone: no tab stop, nothing for a screen reader, no
      // second back button competing with the one in the hero.
      inert={!shown}
      aria-hidden={!shown}
      className={cn(
        "absolute inset-x-0 top-0 flex h-14 items-center gap-3 px-4 lg:px-8",
        "border-b border-[var(--hairline)] bg-[var(--canvas)]/95 backdrop-blur-sm",
        "transition-[opacity,translate] duration-150 ease-out",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
      )}
    >
      <CircleButton onDark={false} onClick={onBack} aria-label="Back">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      </CircleButton>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-[var(--ink)]">{title}</p>
        {meta && <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">{meta}</p>}
      </div>
      {trailing}
    </div>
  </div>
);

/**
 * "Showing the first 100 of 340" — the foot of a list that stopped early.
 *
 * These lists have a ceiling and no way past it, which is survivable. What is
 * not survivable is the ceiling being invisible: a list that ends at row 100
 * with nothing said reads as the whole set, and someone scrolling to the
 * bottom concludes there is nothing older. Now the endpoints report the true
 * `total`, this says so.
 *
 * Renders nothing when everything fits, which is the normal case.
 */
export const TruncatedNote = ({
  shown,
  total,
  noun,
  hint,
}: {
  shown: number;
  total: number;
  /** Plural noun for the things being listed — "jobs", "invoices". */
  noun: string;
  /** How to see the rest, when there is a way. */
  hint?: string;
}) => {
  if (!(total > shown)) return null;
  return (
    <p
      role="status"
      className="rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface)] px-3.5 py-3 text-xs font-bold text-[var(--ink-muted)]"
    >
      Showing the first {shown.toLocaleString("en-IN")} of{" "}
      {total.toLocaleString("en-IN")} {noun}
      {hint ? ` · ${hint}` : ""}
    </p>
  );
};

/** Responsive bento grid. Children opt into span with `col-span-2` etc. */
export const BentoGrid = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", className)} {...props} />
);

/**
 * One share of a total, drawn as a filled length on a track.
 *
 * Every breakdown in this app — the shop/warehouse split, labour against
 * parts, the payment mix, the vehicle mix — is a stack of these, one per
 * labelled row, rather than one stacked multi-colour bar. That is a
 * measured decision, not a stylistic one:
 *
 * The palette has four fills and they are low-chroma by design. Run through a
 * colour validator, the only plausible pair (`--forest` against `--sage`)
 * fails on lightness band and chroma floor, and `--sage` sits at 1.09:1
 * against the track — invisible as a fill. `--forest` on the same track is
 * 9.45:1. So one hue is the only one that can carry a mark here, and a
 * five-category stacked bar would have needed five.
 *
 * Length is therefore the encoding and the label beside it is the identity,
 * which is the same reasoning `StockBar` on the dashboard already documents.
 * It also reads better on a 360px phone: a 3% slice is legible as a 3% bar on
 * its own row and unhittable as a segment inside a shared one, and there is no
 * legend to cross-reference.
 *
 * `aria-hidden`, always: the row states the value and the percentage as text,
 * so nothing here is carried by the bar alone.
 */
export const ShareBar = ({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  /** Extra classes for the track — height overrides live here. */
  className?: string;
}) => {
  const width = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <div
      aria-hidden="true"
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunk)]", className)}
    >
      <div
        className="h-full rounded-full bg-[var(--forest)] transition-[width] duration-300 ease-out"
        // A nonzero share never renders as nothing: below about 2px the fill
        // disappears and the row reads as "none", which is a different fact.
        style={{ width: width > 0 ? `max(3px, ${width}%)` : 0 }}
      />
    </div>
  );
};

export const Badge = ({
  className,
  children,
  color = "slate",
  dot = false,
}: {
  className?: string;
  children: React.ReactNode;
  color?: "slate" | "blue" | "green" | "amber" | "red" | "gray";
  dot?: boolean;
}) => (
  <span
    className={cn(
      // Children are direct flex items on purpose. They used to be wrapped in
      // one inner `truncate` span, and Tailwind's preflight sets
      // `svg { display: block }` — so an icon child became a block inside that
      // span and shoved the label onto a second line, ballooning the pill.
      // As flex items the icon and label sit on one row regardless.
      "inline-flex max-w-full shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full px-2.5 py-1",
      "text-[11px] font-bold leading-none tracking-wide",
      "[&>svg]:shrink-0",
      color === "slate" && "bg-[var(--surface-sunk)] text-[var(--ink-muted)]",
      color === "blue" && "bg-[var(--sage)] text-[var(--forest)]",
      color === "green" && "bg-[var(--forest)] text-[var(--ink-on-dark)]",
      color === "amber" && "bg-[var(--ochre)]/22 text-[var(--ochre-ink)]",
      color === "red" && "bg-[var(--terracotta)]/15 text-[var(--terracotta-hover)]",
      color === "gray" && "bg-[var(--surface-sunk)] text-[var(--ink-label)]",
      className,
    )}
  >
    {dot && (
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          color === "green" && "bg-[var(--sage)]",
          color === "amber" && "bg-[var(--ochre)]",
          color === "red" && "bg-[var(--terracotta)]",
          color === "blue" && "bg-[var(--forest)]",
          (color === "slate" || color === "gray") && "bg-[var(--ink-label)]",
        )}
      />
    )}
    {children}
  </span>
);

export const Field = ({
  label,
  children,
  hint,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && <span className="tile-label text-[var(--ink-label)]">{label}</span>}
    {children}
    {hint && <span className="text-xs text-[var(--ink-muted)]">{hint}</span>}
  </div>
);

export const EmptyState = ({
  title,
  description,
  action,
  icon,
  illustration,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  /** Defaults to the empty-clipboard mark; pass a workshop spot to suit the page. */
  illustration?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center rounded-[var(--r-card)] border border-dashed border-[var(--hairline-strong)] bg-[var(--surface)] px-6 py-12 text-center">
    <div className="mb-4">
      {illustration ?? (icon ? <span className="text-[var(--ink-label)]">{icon}</span> : <SpotClipboard size={84} />)}
    </div>
    <p className="text-base font-extrabold text-[var(--ink)]">{title}</p>
    {description && <p className="mt-1 max-w-[40ch] text-sm text-[var(--ink-muted)]">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({
  message,
  onRetry,
  title = "That didn't go through",
  reference,
}: {
  message?: string;
  onRetry?: () => void;
  title?: string;
  /** Support reference from the server, shown so it can be quoted. */
  reference?: string;
}) => (
  <div
    role="alert"
    className="flex flex-col items-center justify-center rounded-[var(--r-card)] border border-[var(--terracotta)]/25 bg-[var(--terracotta)]/8 px-6 py-12 text-center"
  >
    <SpotCone size={84} className="mb-4" />
    <p className="text-base font-extrabold text-[var(--terracotta-hover)]">{title}</p>
    <p className="mt-1 max-w-[45ch] text-sm text-[var(--ink-muted)]">
      {message ?? "Check your connection and try again."}
    </p>
    {reference && (
      <p className="tile-label mt-3 text-[var(--ink-label)]">Reference {reference}</p>
    )}
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-5">
        Try again
      </Button>
    )}
  </div>
);

/**
 * Compact inline error for forms and sheets, where a full-surface ErrorState
 * would be out of scale. role="alert" so it is announced rather than only seen.
 */
export const InlineError = ({
  message,
  reference,
  className,
}: {
  message: string;
  reference?: string;
  className?: string;
}) => (
  <div
    role="alert"
    className={cn(
      "flex items-start gap-2.5 rounded-[var(--r-control)] border border-[var(--terracotta)]/25",
      "bg-[var(--terracotta)]/8 px-3.5 py-3",
      className,
    )}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="mt-0.5 shrink-0 text-[var(--terracotta)]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <div className="min-w-0">
      <p className="text-xs font-bold leading-relaxed text-[var(--terracotta-hover)]">{message}</p>
      {reference && (
        <p className="tile-label mt-1 text-[var(--ink-label)]">Reference {reference}</p>
      )}
    </div>
  </div>
);

/**
 * Blocking-wait state. Renders nothing for `delayMs` first, so a fast
 * response never flashes a loader — the single biggest cause of loading
 * states feeling noisy. For lists, prefer <Skeleton> rows over this.
 */
export const LoadingState = ({
  label = "Just a moment…",
  delayMs = 400,
  className,
}: {
  label?: string;
  delayMs?: number;
  className?: string;
}) => {
  const [show, setShow] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) return;
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--r-card)] bg-[var(--surface)] px-6 py-12 text-center",
        className,
      )}
    >
      <SpotGear size={72} />
      <p className="mt-3 text-sm font-bold text-[var(--ink-muted)]">{label}</p>
    </div>
  );
};

/**
 * Terminal outcome panel — the moment a job is invoiced, a payment settles,
 * or an action genuinely fails. Deliberately NOT used for routine saves:
 * those stay as a toast, because a celebration on every keystroke is noise.
 */
export const ResultPanel = ({
  status,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: {
  status: "success" | "error";
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col items-center px-2 py-4 text-center", className)}>
    <div className="stamp-in">
      {status === "success" ? <SpotStamp size={88} /> : <SpotCone size={88} />}
    </div>
    <p
      className={cn(
        "mt-4 text-lg font-extrabold",
        status === "success" ? "text-[var(--forest)]" : "text-[var(--terracotta-hover)]",
      )}
    >
      {title}
    </p>
    {description && (
      <p className="mt-1.5 max-w-[42ch] text-sm text-[var(--ink-muted)]">{description}</p>
    )}
    {(primaryAction || secondaryAction) && (
      <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
        {secondaryAction}
        {primaryAction}
      </div>
    )}
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-shimmer rounded-[var(--r-tile)]", className)} />
);

export const Sheet = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-[var(--forest-deep)]/45"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 30, stiffness: 380 }}
            className={cn(
              "relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto",
              "rounded-t-[var(--r-panel)] bg-[var(--surface-bright)] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]",
              "text-[var(--ink)] shadow-[var(--lift-3)] sm:rounded-[var(--r-panel)] sm:pb-6",
            )}
          >
            {title && (
              <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="text-lg font-extrabold text-[var(--ink)]">{title}</h3>
                <CircleButton onDark={false} onClick={onClose} aria-label="Close" className="h-8 w-8">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </CircleButton>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
