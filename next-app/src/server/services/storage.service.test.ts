import { describe, expect, it, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/connection";
import { resetBusinessData, seedCustomerAndPart } from "@/test/helpers";
import {
  clearStorageCache,
  getStorageSnapshot,
  parseCapacity,
} from "@/server/services/storage.service";

describe("parseCapacity", () => {
  it("reads plain bytes and readable sizes", () => {
    expect(parseCapacity("1024")).toBe(1024);
    expect(parseCapacity("10GB")).toBe(10 * 1024 ** 3);
    expect(parseCapacity("512 mb")).toBe(512 * 1024 ** 2);
    expect(parseCapacity("0.5gb")).toBe(0.5 * 1024 ** 3);
  });

  it("returns null for anything it cannot trust, so no percentage is invented", () => {
    expect(parseCapacity(undefined)).toBeNull();
    expect(parseCapacity("")).toBeNull();
    expect(parseCapacity("lots")).toBeNull();
    expect(parseCapacity("0")).toBeNull();
    expect(parseCapacity("-5GB")).toBeNull();
  });
});

describe("storage snapshot", () => {
  beforeEach(async () => {
    await resetBusinessData();
    clearStorageCache();
    delete process.env.DB_CAPACITY_BYTES;
  });

  it("measures the database and every table in it", async () => {
    await seedCustomerAndPart(10);
    const snap = await getStorageSnapshot({ force: true });

    expect(snap.databaseBytes).toBeGreaterThan(0);
    expect(snap.totals.tables).toBeGreaterThan(15);
    expect(snap.tables.every((t) => t.totalBytes > 0)).toBe(true);
    // Sorted largest first, so the console can render it as it arrives.
    const sizes = snap.tables.map((t) => t.totalBytes);
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });

  it("accounts for the whole database: tables plus overhead is the total", () => {
    return getStorageSnapshot({ force: true }).then((snap) => {
      expect(snap.tablesBytes + snap.overheadBytes).toBe(snap.databaseBytes);
      const bucketTotal = snap.buckets.reduce((sum, b) => sum + b.bytes, 0);
      expect(bucketTotal).toBe(snap.databaseBytes);
    });
  });

  it("splits the total by storage kind without losing bytes to the free space map", async () => {
    await seedCustomerAndPart(10);
    const snap = await getStorageSnapshot({ force: true });

    // pg_relation_size would leave the free space and visibility maps out, so
    // the parts would sum to less than the whole. They must reconcile exactly.
    for (const t of snap.tables) {
      expect(t.heapBytes + t.indexBytes + t.toastBytes).toBe(t.totalBytes);
    }
    expect(snap.kinds.reduce((sum, k) => sum + k.bytes, 0)).toBe(snap.databaseBytes);
  });

  it("reports how much of the connection limit is in use", async () => {
    const snap = await getStorageSnapshot({ force: true });
    expect(snap.connections).not.toBeNull();
    expect(snap.connections!.max).toBeGreaterThan(0);
    expect(snap.connections!.inUse).toBeGreaterThan(0);
    expect(snap.connections!.pct).toBeCloseTo(
      (snap.connections!.inUse / snap.connections!.max) * 100, 6);
  });

  it("counts rows exactly rather than trusting planner statistics", async () => {
    await seedCustomerAndPart(10);
    await seedCustomerAndPart(10);
    const snap = await getStorageSnapshot({ force: true });

    const customers = snap.tables.find((t) => t.name === "customers");
    expect(customers?.rows).toBe(2);
    expect(customers?.rowsAreEstimated).toBe(false);
    expect(customers?.bucket).toBe("business");
    expect(snap.tables.find((t) => t.name === "audit_logs")?.bucket).toBe("operational");
  });

  it("flags a table the application schema does not declare", async () => {
    // Stands in for real drift: production carries two tables that appear in
    // neither schema.ts nor any migration.
    await db.execute(sql`create table if not exists rogue_table (id int)`);
    try {
      const snap = await getStorageSnapshot({ force: true });
      expect(snap.tables.find((t) => t.name === "rogue_table")?.bucket).toBe("other");
      expect(snap.tables.find((t) => t.name === "customers")?.bucket).toBe("business");
    } finally {
      await db.execute(sql`drop table if exists rogue_table`);
    }
  });

  it("reports no percentage when no budget is configured", async () => {
    const snap = await getStorageSnapshot({ force: true });
    expect(snap.capacityMode).toBe("unbounded");
    expect(snap.usedPct).toBeNull();
    expect(snap.freeBytes).toBeNull();
    expect(snap.notes.some((n) => n.includes("DB_CAPACITY_BYTES"))).toBe(true);
  });

  it("reports headroom against a configured budget", async () => {
    process.env.DB_CAPACITY_BYTES = "1GB";
    const snap = await getStorageSnapshot({ force: true });

    expect(snap.capacityMode).toBe("quota");
    expect(snap.capacityBytes).toBe(1024 ** 3);
    expect(snap.usedPct).toBeCloseTo((snap.databaseBytes / 1024 ** 3) * 100, 6);
    expect(snap.freeBytes).toBe(1024 ** 3 - snap.databaseBytes);
  });

  it("says dead rows are unavailable on the embedded engine instead of reporting zero", async () => {
    const snap = await getStorageSnapshot({ force: true });
    // The test harness always runs PGlite, which never records them.
    expect(snap.engine).toBe("pglite");
    expect(snap.totals.deadRows).toBeNull();
    expect(snap.tables.every((t) => t.deadRows === null)).toBe(true);
  });

  it("serves the cached snapshot until it is forced", async () => {
    const first = await getStorageSnapshot({ force: true });
    expect(first.cached).toBe(false);
    const second = await getStorageSnapshot();
    expect(second.cached).toBe(true);
    expect(second.capturedAt).toBe(first.capturedAt);
    expect((await getStorageSnapshot({ force: true })).cached).toBe(false);
  });
});
