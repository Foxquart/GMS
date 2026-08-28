import type { Tone } from "@/components/ui";

/**
 * One mapping of operational state to colour, shared by every console
 * surface: forest = healthy, ochre = degraded, terracotta = unhealthy.
 */
export function statusTone(status?: string | null): Tone {
  const s = (status ?? "").toUpperCase();
  if (s === "UNHEALTHY" || s === "CRITICAL" || s === "DOWN" || s === "FAILED") return "terracotta";
  if (s === "DEGRADED" || s === "WARNING" || s === "SLOW") return "ochre";
  return "forest";
}

export function statusBadgeColor(status?: string | null): "green" | "amber" | "red" {
  const tone = statusTone(status);
  if (tone === "terracotta") return "red";
  if (tone === "ochre") return "amber";
  return "green";
}

/** Database latency is benchmarked against the 500ms alert threshold. */
export function latencyTone(ms?: number | null): Tone {
  if (ms == null) return "cream";
  if (ms > 500) return "terracotta";
  if (ms > 200) return "ochre";
  return "sage";
}

export function formatWhen(value?: string | Date | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function formatTime(value?: string | Date | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString();
}
