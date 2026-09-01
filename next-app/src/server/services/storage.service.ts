import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db, isPglite } from "../db/connection";
import * as appSchema from "../db/schema";

/**
 * Storage analytics for the operator console: how much of the database is
 * used, how much room is left, and what kind of data is occupying it.
 *
 * Two engines sit behind `db` — a managed Postgres (Neon in production) and
 * the embedded PGlite used for local development and tests. Everything here
 * is read-only catalog introspection that both understand, except where noted
 * against `isPglite()`: PGlite's statistics collector never records dead
 * tuples, so those are reported as unavailable rather than as a confident
 * zero.
 */

// ─── Shape ───────────────────────────────────────────────────────────
export type StorageBucketKey = "business" | "operational" | "other" | "overhead";

export type TableStorage = {
  name: string;
  bucket: Exclude<StorageBucketKey, "overhead">;
  totalBytes: number;
  heapBytes: number;
  indexBytes: number;
  toastBytes: number;
  /** Exact for tables small enough to count; estimated from statistics above that. */
  rows: number;
  rowsAreEstimated: boolean;
  /** null when the engine does not collect it. */
  deadRows: number | null;
  lastVacuumAt: string | null;
  pctOfDatabase: number;
};

export type StorageSnapshot = {
  capturedAt: string;
  engine: "postgres" | "pglite";
  serverVersion: string;
  /** What Postgres reports for the whole database, catalogs included. */
  databaseBytes: number;
  /** The part of that which is this application's own tables. */
  tablesBytes: number;
  /** Catalogs, WAL bookkeeping and free space — the difference of the two above. */
  overheadBytes: number;
  capacityBytes: number | null;
  capacityMode: "quota" | "unbounded";
  usedPct: number | null;
  freeBytes: number | null;
  buckets: { key: StorageBucketKey; label: string; bytes: number; pct: number }[];
  /** The same total split by storage kind rather than by what the data means. */
  kinds: { key: "data" | "indexes" | "toast" | "overhead"; label: string; bytes: number; pct: number }[];
  connections: { inUse: number; max: number; pct: number } | null;
  tables: TableStorage[];
  totals: { tables: number; rows: number; deadRows: number | null; indexBytes: number };
  notes: string[];
};

// ─── Buckets ─────────────────────────────────────────────────────────
/**
 * Every table this application actually declares, read from the Drizzle schema
 * rather than hand-listed. A hand-maintained list would drift the moment
 * someone adds a table, and drift is precisely what this needs to detect: a
 * table present in the database but absent here is one nothing in the repo
 * knows about, and it is reported as such instead of being quietly folded
 * into a total.
 */
const SCHEMA_TABLES = new Set(
  // `Object.values` over the schema module yields enums and relations too, so
  // the narrowing is done by Drizzle's own `is` rather than by a type
  // predicate — the union of every exported table is not assignable to the
  // base `PgTable` a predicate would have to name.
  Object.values(appSchema)
    .filter((value) => is(value, PgTable))
    .map((table) => getTableName(table as PgTable)),
);

/**
 * The tables that accumulate as a by-product of running the system rather than
 * from a workshop doing business. These grow on their own — every request, probe
 * and stock movement adds to them — so they are worth watching separately from
 * the records an owner would actually miss.
 */
const OPERATIONAL_TABLES = new Set([
  "audit_logs", "system_health_checks", "system_alerts", "stock_movements",
]);

const BUCKET_LABELS: Record<StorageBucketKey, string> = {
  business: "Business records",
  operational: "Operational log",
  other: "Unknown to the app",
  overhead: "System overhead",
};

function bucketFor(name: string): Exclude<StorageBucketKey, "overhead"> {
  if (OPERATIONAL_TABLES.has(name)) return "operational";
  if (SCHEMA_TABLES.has(name)) return "business";
  return "other";
}

// ─── Capacity ────────────────────────────────────────────────────────
/**
 * A managed Postgres cannot be asked how large its plan allows it to grow —
 * the limit lives in the provider's billing, not in the database — so the
 * budget is configured. Accepts plain bytes or a readable size:
 * `DB_CAPACITY_BYTES=10GB`.
 *
 * Returns null when unset, and the console then reports size and growth
 * without a percentage. Inventing a denominator so the gauge has something to
 * draw would make the one number an operator acts on the one number nobody
 * checked.
 */
export function parseCapacity(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const m = /^\s*([\d.]+)\s*(b|kb|mb|gb|tb)?\s*$/i.exec(raw);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = (m[2] ?? "b").toLowerCase();
  const factor = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 }[unit] ?? 1;
  return Math.round(value * factor);
}

/**
 * Counting rows exactly means reading every one of them. That is free at the
 * scale a workshop runs at and stays honest as tables grow uneven, but it is
 * not free forever — so anything with a heap above this falls back to the
 * planner's estimate rather than turning a monitoring page into a table scan.
 */
const EXACT_COUNT_HEAP_LIMIT = 64 * 1024 * 1024;

/** Drizzle's two drivers disagree on result shape; both are handled here. */
function rowsOf(result: any): any[] {
  return (result?.rows ?? result ?? []) as any[];
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Postgres identifier quoting, for names that came from the catalog. */
const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

// ─── Snapshot ────────────────────────────────────────────────────────
async function buildSnapshot(): Promise<StorageSnapshot> {
  const pglite = isPglite();
  const notes: string[] = [];

  const [sizeRes, tableRes] = await Promise.all([
    db.execute(sql`
      select pg_database_size(current_database()) as db_bytes,
             current_setting('server_version') as version,
             current_setting('max_connections')::int as max_connections,
             (select count(*) from pg_stat_activity
               where datname = current_database()) as connections
    `),
    // Sizes and statistics for every ordinary table in the application schema.
    // Discovered from the catalog rather than from a hardcoded list, so a
    // table nobody remembers creating still shows up in the totals.
    //
    // The heap figure is `pg_table_size` minus TOAST rather than
    // `pg_relation_size`, so that data + indexes + TOAST reconciles to the
    // total exactly. `pg_relation_size` returns only the main fork and leaves
    // out the free space and visibility maps — on a 440KB table that silently
    // lost 5% of the bytes, and the breakdown quietly failed to add up.
    // `pg_table_size` already includes TOAST, hence subtracting it back out to
    // keep the three parts disjoint.
    db.execute(sql`
      select c.relname as name,
             pg_total_relation_size(c.oid) as total_bytes,
             pg_table_size(c.oid) - coalesce(pg_total_relation_size(c.reltoastrelid), 0) as heap_bytes,
             pg_indexes_size(c.oid) as index_bytes,
             coalesce(pg_total_relation_size(c.reltoastrelid), 0) as toast_bytes,
             coalesce(s.n_live_tup, 0) as live_rows,
             coalesce(s.n_dead_tup, 0) as dead_rows,
             greatest(s.last_vacuum, s.last_autovacuum) as last_vacuum_at
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        left join pg_stat_user_tables s on s.relid = c.oid
       where n.nspname = 'public' and c.relkind = 'r'
       order by pg_total_relation_size(c.oid) desc
    `),
  ]);

  const databaseBytes = num(rowsOf(sizeRes)[0]?.db_bytes);
  const serverVersion = String(rowsOf(sizeRes)[0]?.version ?? "unknown");
  const rawTables = rowsOf(tableRes);

  // Exact counts for everything small enough, in one round trip. The planner's
  // own estimate is not usable here: on a young database it reads -1 for a
  // table that has never been analyzed, and it drifted from the live figure on
  // every table checked against production.
  const countable = rawTables.filter((r) => num(r.heap_bytes) <= EXACT_COUNT_HEAP_LIMIT);
  const exactCounts = new Map<string, number>();
  if (countable.length > 0) {
    const union = countable
      .map((r) => {
        const name = String(r.name);
        // Both the literal and the identifier come from the catalog, and both
        // are escaped anyway — this string is assembled, so nothing here gets
        // to assume the names are tame.
        return `select '${name.replace(/'/g, "''")}' as name, count(*)::bigint as n from public.${quoteIdent(name)}`;
      })
      .join(" union all ");
    const counts = await db.execute(sql.raw(union));
    for (const row of rowsOf(counts)) exactCounts.set(String(row.name), num(row.n));
  }
  if (countable.length < rawTables.length) {
    notes.push(
      "Row counts for the largest tables are estimated from statistics — counting them exactly would read every row.",
    );
  }

  const tables: TableStorage[] = rawTables.map((r) => {
    const name = String(r.name);
    const exact = exactCounts.get(name);
    const totalBytes = num(r.total_bytes);
    return {
      name,
      bucket: bucketFor(name),
      totalBytes,
      heapBytes: num(r.heap_bytes),
      indexBytes: num(r.index_bytes),
      toastBytes: num(r.toast_bytes),
      rows: exact ?? num(r.live_rows),
      rowsAreEstimated: exact === undefined,
      deadRows: pglite ? null : num(r.dead_rows),
      lastVacuumAt: r.last_vacuum_at ? new Date(r.last_vacuum_at).toISOString() : null,
      pctOfDatabase: databaseBytes > 0 ? (totalBytes / databaseBytes) * 100 : 0,
    };
  });

  const tablesBytes = tables.reduce((sum, t) => sum + t.totalBytes, 0);
  // Catalogs, the write-ahead bookkeeping and free space already claimed from
  // the filesystem. Derived rather than queried, and worth showing: on a young
  // database it is most of the total, and a breakdown that omits it looks
  // broken because the parts do not add up to the whole.
  const overheadBytes = Math.max(0, databaseBytes - tablesBytes);

  const bucketBytes = (key: Exclude<StorageBucketKey, "overhead">) =>
    tables.filter((t) => t.bucket === key).reduce((sum, t) => sum + t.totalBytes, 0);

  const buckets = (["business", "operational", "other", "overhead"] as const).map((key) => {
    const bytes = key === "overhead" ? overheadBytes : bucketBytes(key);
    return {
      key,
      label: BUCKET_LABELS[key],
      bytes,
      pct: databaseBytes > 0 ? (bytes / databaseBytes) * 100 : 0,
    };
  });

  const sumBy = (pick: (t: TableStorage) => number) =>
    tables.reduce((sum, t) => sum + pick(t), 0);
  const pctOf = (b: number) => (databaseBytes > 0 ? (b / databaseBytes) * 100 : 0);

  // The same total on a second axis: not what the data means, but what form it
  // takes. An index-heavy database and a TOAST-heavy one need different
  // remedies, and neither is visible from the per-purpose split above.
  const kinds = [
    { key: "data" as const, label: "Table data", bytes: sumBy((t) => t.heapBytes) },
    { key: "indexes" as const, label: "Indexes", bytes: sumBy((t) => t.indexBytes) },
    { key: "toast" as const, label: "Large values (TOAST)", bytes: sumBy((t) => t.toastBytes) },
    { key: "overhead" as const, label: "System overhead", bytes: overheadBytes },
  ].map((k) => ({ ...k, pct: pctOf(k.bytes) }));

  const maxConnections = num(rowsOf(sizeRes)[0]?.max_connections);
  const inUseConnections = num(rowsOf(sizeRes)[0]?.connections);
  const connections =
    maxConnections > 0
      ? {
          inUse: inUseConnections,
          max: maxConnections,
          pct: (inUseConnections / maxConnections) * 100,
        }
      : null;

  const capacityBytes = parseCapacity(process.env.DB_CAPACITY_BYTES);
  if (capacityBytes === null) {
    notes.push(
      "No storage budget is configured, so there is no percentage to report. Set DB_CAPACITY_BYTES to your plan's limit (for example 10GB) to track headroom.",
    );
  }
  if (pglite) {
    notes.push(
      "Running on the embedded engine, which does not record dead rows or autovacuum activity. Those figures are reported by the managed database in production.",
    );
  }

  return {
    capturedAt: new Date().toISOString(),
    engine: pglite ? "pglite" : "postgres",
    serverVersion,
    databaseBytes,
    tablesBytes,
    overheadBytes,
    capacityBytes,
    capacityMode: capacityBytes === null ? "unbounded" : "quota",
    usedPct: capacityBytes ? (databaseBytes / capacityBytes) * 100 : null,
    freeBytes: capacityBytes ? Math.max(0, capacityBytes - databaseBytes) : null,
    buckets,
    kinds,
    connections,
    tables,
    totals: {
      tables: tables.length,
      rows: tables.reduce((sum, t) => sum + t.rows, 0),
      deadRows: pglite ? null : tables.reduce((sum, t) => sum + (t.deadRows ?? 0), 0),
      indexBytes: tables.reduce((sum, t) => sum + t.indexBytes, 0),
    },
    notes,
  };
}

// ─── Cache ───────────────────────────────────────────────────────────
/**
 * A full size sweep is the most expensive thing this console does — measured
 * at ~400ms against production, on top of a cold start of nearly a second
 * when the compute has scaled to zero. Storage does not move fast enough to
 * be worth asking twice a minute, and polling it would hold a serverless
 * database awake purely to watch it.
 */
const CACHE_MS = 60_000;
let cached: { at: number; snapshot: StorageSnapshot } | null = null;

export async function getStorageSnapshot({ force = false } = {}): Promise<
  StorageSnapshot & { cached: boolean }
> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) {
    return { ...cached.snapshot, cached: true };
  }
  const snapshot = await buildSnapshot();
  cached = { at: Date.now(), snapshot };
  return { ...snapshot, cached: false };
}

/** Test seam — the cache is process-wide and would otherwise leak across cases. */
export function clearStorageCache() {
  cached = null;
}
