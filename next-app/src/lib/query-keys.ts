/**
 * Staleness tiers.
 *
 * Reference data (categories, suppliers, the signed-in user) changes maybe
 * once a week, but was being refetched on every navigation. Spreading these
 * into a query removes the request entirely on most page loads.
 */
export const REFERENCE_QUERY = {
  staleTime: 30 * 60_000,
  gcTime: 60 * 60_000,
} as const;

/** Figures that should feel live — dashboards, balances, outstanding money. */
export const LIVE_QUERY = {
  staleTime: 15_000,
} as const;
