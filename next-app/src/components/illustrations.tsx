"use client";

import { cn } from "@/lib/cn";

/* ─────────────────────────────────────────────────────────────────────
   Workshop spot illustrations.

   Hand-drawn line style: 2.5px rounded strokes in forest ink, with flat
   accent fills. Inline SVG so they inherit the palette and cost nothing
   to load. Every illustration is decorative — callers supply the words.

   Motion discipline: only the loading marks move, and they move at a
   steady, slow rate because they are reporting "still working", not
   performing. Everything stops under prefers-reduced-motion.
   ───────────────────────────────────────────────────────────────────── */

type SpotProps = { className?: string; size?: number };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Cog — the loading mark. Rotates once every 3s, linear, never bounces. */
export function SpotGear({ className, size = 96 }: SpotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={cn("text-[var(--forest)]", className)}
      aria-hidden="true"
    >
      <g className="gear-spin" style={{ transformOrigin: "48px 48px" }}>
        <path
          {...stroke}
          fill="var(--ochre)"
          d="M48 20l5.2 1.1 3.4-4.1 4.6 2.7-.6 5.3 4.5 2.9 4.8-2.3 3.3 4.1-3.2 4.3 2.2 4.9 5.3.7.6 5.3-5 1.9-.9 5.3 4 3.6-2.7 4.6-5.2-1.2-3.5 4.1-4.6-2.6-1.9 5-5.3.6-2-5-5.3.9-3.6 4-4.6-2.7 1.2-5.2-4.1-3.5 2.6-4.6-5-1.9-.6-5.3 5-2 .9-5.3-4-3.6 2.7-4.6 5.2 1.2 3.5-4.1z"
          transform="translate(-8 -8) scale(1.05)"
        />
        <circle cx="48" cy="48" r="11" fill="var(--canvas)" stroke="currentColor" strokeWidth={2.5} />
      </g>
    </svg>
  );
}

/** Tyre — alternate loading mark for stock/parts contexts. */
export function SpotTyre({ className, size = 96 }: SpotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={cn("text-[var(--forest)]", className)}
      aria-hidden="true"
    >
      <circle cx="48" cy="48" r="30" fill="var(--forest)" />
      <circle cx="48" cy="48" r="14" fill="var(--canvas)" />
      <g className="gear-spin" style={{ transformOrigin: "48px 48px" }}>
        <g stroke="var(--canvas)" strokeWidth={3} strokeLinecap="round">
          <line x1="48" y1="20" x2="48" y2="28" />
          <line x1="48" y1="68" x2="48" y2="76" />
          <line x1="20" y1="48" x2="28" y2="48" />
          <line x1="68" y1="48" x2="76" y2="48" />
          <line x1="28" y1="28" x2="34" y2="34" />
          <line x1="62" y1="62" x2="68" y2="68" />
          <line x1="68" y1="28" x2="62" y2="34" />
          <line x1="34" y1="62" x2="28" y2="68" />
        </g>
        <circle cx="48" cy="48" r="5" fill="var(--ochre)" />
      </g>
    </svg>
  );
}

/** Ring spanner crossed with a screwdriver — empty workbench, nothing here yet. */
export function SpotTools({ className, size = 96 }: SpotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={cn("text-[var(--forest)]", className)}
      aria-hidden="true"
    >
      {/* screwdriver, behind */}
      <g transform="rotate(32 48 48)">
        <rect {...stroke} x="43" y="20" width="11" height="24" rx="5.5" fill="var(--ochre)" />
        <rect {...stroke} x="45.5" y="44" width="6" height="20" fill="var(--surface-bright)" />
        <path {...stroke} d="M45.5 64h6v6h-6z" fill="var(--surface-bright)" />
      </g>
      {/* ring spanner, in front */}
      <g transform="rotate(-38 48 48)">
        <rect {...stroke} x="43.5" y="34" width="10" height="38" rx="5" fill="var(--sage)" />
        <circle {...stroke} cx="48.5" cy="30" r="11" fill="var(--sage)" />
        <circle {...stroke} cx="48.5" cy="30" r="4.5" fill="var(--canvas)" />
      </g>
    </svg>
  );
}

/** Clipboard — empty job list / no records. */
export function SpotClipboard({ className, size = 96 }: SpotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={cn("text-[var(--forest)]", className)}
      aria-hidden="true"
    >
      <rect x="22" y="20" width="52" height="60" rx="8" fill="var(--surface-bright)" stroke="currentColor" strokeWidth={2.5} />
      <rect x="36" y="13" width="24" height="14" rx="6" fill="var(--sage)" stroke="currentColor" strokeWidth={2.5} />
      <line {...stroke} x1="33" y1="42" x2="63" y2="42" opacity="0.5" />
      <line {...stroke} x1="33" y1="53" x2="55" y2="53" opacity="0.5" />
      <line {...stroke} x1="33" y1="64" x2="59" y2="64" opacity="0.5" />
    </svg>
  );
}

/** Traffic cone — something went wrong. Static: errors should not wobble. */
export function SpotCone({ className, size = 96 }: SpotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={cn("text-[var(--terracotta-hover)]", className)}
      aria-hidden="true"
    >
      <path {...stroke} fill="var(--terracotta)" d="M48 18l17 50H31z" />
      <path d="M40 44h16l2.5 8H37.5z" fill="var(--canvas)" opacity="0.85" />
      <rect x="22" y="68" width="52" height="9" rx="4.5" fill="var(--terracotta)" stroke="currentColor" strokeWidth={2.5} />
      <path {...stroke} d="M48 28v6" stroke="var(--canvas)" opacity="0.7" />
    </svg>
  );
}

/** Stamped tick — a job finished, an invoice settled. */
export function SpotStamp({ className, size = 96 }: SpotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={cn("text-[var(--forest)]", className)}
      aria-hidden="true"
    >
      <circle cx="48" cy="48" r="28" fill="var(--forest)" />
      <circle cx="48" cy="48" r="34" fill="none" stroke="currentColor" strokeWidth={2.5} strokeDasharray="5 6" opacity="0.45" />
      <path
        d="M36 49l8.5 8.5L61 40"
        fill="none"
        stroke="var(--sage)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Vehicle marks, matched to the vehicleType enum. */
export function SpotCar({ className, size = 96 }: SpotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" className={cn("text-[var(--forest)]", className)} aria-hidden="true">
      <path {...stroke} fill="var(--sage)" d="M18 56v-6l6-16a7 7 0 016.6-4.6h30.8A7 7 0 0168 34l6 16v6a4 4 0 01-4 4h-4a4 4 0 01-4-4v-2H30v2a4 4 0 01-4 4h-4a4 4 0 01-4-4z" />
      <path {...stroke} d="M24 50h48" />
      <circle cx="31" cy="50" r="0.5" />
      <path {...stroke} d="M28 38h36" opacity="0.4" />
      <circle cx="30" cy="62" r="6" fill="var(--forest)" />
      <circle cx="62" cy="62" r="6" fill="var(--forest)" />
    </svg>
  );
}

export function SpotBike({ className, size = 96 }: SpotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" className={cn("text-[var(--forest)]", className)} aria-hidden="true">
      <circle {...stroke} cx="26" cy="60" r="13" fill="var(--sage)" />
      <circle {...stroke} cx="70" cy="60" r="13" fill="var(--sage)" />
      <path {...stroke} d="M26 60l12-22h16l10 22" />
      <path {...stroke} d="M38 38h20" />
      <path {...stroke} d="M56 38l8-8h6" />
      <path {...stroke} d="M32 44h14" />
    </svg>
  );
}

export function SpotScooty({ className, size = 96 }: SpotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" className={cn("text-[var(--forest)]", className)} aria-hidden="true">
      <circle {...stroke} cx="28" cy="62" r="11" fill="var(--sage)" />
      <circle {...stroke} cx="70" cy="62" r="11" fill="var(--sage)" />
      <path {...stroke} fill="var(--ochre)" d="M39 62c-4-14 2-22 12-22h8l6 22z" />
      <path {...stroke} d="M59 40l6-14h7" />
      <path {...stroke} d="M39 62H28" />
    </svg>
  );
}

/** Fuel/oil can — inventory and stock contexts. */
export function SpotOilCan({ className, size = 96 }: SpotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" className={cn("text-[var(--forest)]", className)} aria-hidden="true">
      <rect x="26" y="38" width="36" height="36" rx="7" fill="var(--ochre)" stroke="currentColor" strokeWidth={2.5} />
      <path {...stroke} d="M62 48h8l8-10" />
      <rect x="36" y="28" width="16" height="10" rx="4" fill="var(--sage)" stroke="currentColor" strokeWidth={2.5} />
      <path {...stroke} d="M34 58h20" opacity="0.5" />
    </svg>
  );
}

export const VEHICLE_SPOT = {
  CAR: SpotCar,
  BIKE: SpotBike,
  SCOOTY: SpotScooty,
  AUTO: SpotCar,
  OTHER: SpotTools,
} as const;
