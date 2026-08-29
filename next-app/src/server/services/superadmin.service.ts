import { db } from "../db/connection";
import * as schema from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { scryptSync, randomBytes } from "node:crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** A route handler slower than this is reported as DEGRADED. */
export const API_LATENCY_THRESHOLD_MS = 1000;
/** A database round trip slower than this opens an alert. */
export const DB_LATENCY_THRESHOLD_MS = 500;

export type DatabaseHealth = {
  status: string;
  latencyMs: number;
  details: string;
};

/**
 * Times a bare `SELECT 1` so the number reports connection round trip and
 * nothing else — a `count(*)` would grow with the table and read as latency.
 */
async function pingDatabase(): Promise<DatabaseHealth> {
  const startedAt = Date.now();
  try {
    await db.execute(sql`select 1`);
    const latencyMs = Date.now() - startedAt;
    return latencyMs > DB_LATENCY_THRESHOLD_MS
      ? { status: "DEGRADED", latencyMs, details: `Database round trip is high: ${latencyMs}ms` }
      : { status: "HEALTHY", latencyMs, details: "Database responded to a round-trip probe" };
  } catch (err: any) {
    return {
      status: "UNHEALTHY",
      latencyMs: Date.now() - startedAt,
      details: err?.message || "Failed to reach database",
    };
  }
}

export async function getSuperadminOverview(dbHealth?: DatabaseHealth) {
  // Reuse the caller's probe when there is one; a second ping in the same
  // request would only report a warm connection, not the real round trip.
  const database = dbHealth ?? (await pingDatabase());

  // One round trip instead of three. Every query here costs a full network
  // round trip to the database, so awaiting them in sequence multiplies that
  // latency by the number of queries.
  const [[admins], [alerts], recentAudit] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(sql`upper(${schema.users.role}) = 'ADMIN'`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.systemAlerts)
      .where(eq(schema.systemAlerts.status, "OPEN")),
    db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(10),
  ]);

  return {
    systemStatus: database.status === "HEALTHY" ? "HEALTHY" : "DEGRADED",
    dbStatus: database.status,
    dbLatencyMs: database.latencyMs,
    activeAdmins: admins.count,
    openAlertsCount: alerts.count,
    recentAudit,
    appVersion: "1.1.0",
    lastCheckAt: new Date().toISOString(),
  };
}

/**
 * Records the probe and opens an alert if it breached. Split out so callers
 * can run it alongside their other queries rather than in front of them.
 */
export async function recordHealthCheck(database: DatabaseHealth) {
  await db.insert(schema.systemHealthChecks).values({
    checkType: "DATABASE",
    status: database.status,
    latencyMs: database.latencyMs,
    details: database.details,
  });

  if (database.status === "HEALTHY") return;

  const existing = await db
    .select()
    .from(schema.systemAlerts)
    .where(eq(schema.systemAlerts.status, "OPEN"))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(schema.systemAlerts).values({
    severity: database.status === "UNHEALTHY" ? "CRITICAL" : "WARNING",
    condition:
      database.status === "UNHEALTHY"
        ? "Database unreachable"
        : `Database latency above ${DB_LATENCY_THRESHOLD_MS}ms`,
    threshold: `${DB_LATENCY_THRESHOLD_MS}ms`,
    currentValue: `${database.latencyMs}ms`,
    status: "OPEN",
  });
}

export async function checkSystemHealth() {
  const database = await pingDatabase();
  await recordHealthCheck(database);
  return { database, timestamp: new Date().toISOString() };
}

export { pingDatabase };

export async function listAdmins() {
  return await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      isActive: schema.users.isActive,
      lastLoginAt: schema.users.lastLoginAt,
      lastActivityAt: schema.users.lastActivityAt,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users);
}

export async function createAdminUser(data: { name: string; email: string; password: string; role?: string }) {
  const role = (data.role || "ADMIN").toUpperCase();
  const passwordHash = hashPassword(data.password);

  const [newUser] = await db
    .insert(schema.users)
    .values({
      name: data.name,
      email: data.email,
      passwordHash,
      role,
      isActive: true,
    })
    .returning();

  return newUser;
}

export async function toggleAdminStatus(id: string, isActive: boolean) {
  const [updated] = await db
    .update(schema.users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(schema.users.id, id))
    .returning();
  return updated;
}

export async function deleteAdminUser(id: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!user) throw new Error("User not found");
  if (user.role.toUpperCase() === "SUPERADMIN") {
    throw new Error("Cannot delete SUPERADMIN user");
  }
  await db.delete(schema.users).where(eq(schema.users.id, id));
  return { success: true };
}

export async function getAuditLogs(limit = 50) {
  return await db
    .select()
    .from(schema.auditLogs)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit);
}

export async function getSystemAlerts() {
  return await db
    .select()
    .from(schema.systemAlerts)
    .orderBy(desc(schema.systemAlerts.firstDetectedAt));
}
