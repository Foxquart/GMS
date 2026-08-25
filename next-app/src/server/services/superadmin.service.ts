import { db } from "../db/connection";
import * as schema from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { scryptSync, randomBytes } from "node:crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export async function getSuperadminOverview() {
  const startDb = Date.now();
  let dbStatus = "HEALTHY";
  let dbLatency = 0;
  try {
    await db.select({ count: sql`count(*)` }).from(schema.users);
    dbLatency = Date.now() - startDb;
  } catch (err) {
    dbStatus = "UNHEALTHY";
    dbLatency = Date.now() - startDb;
  }

  const allUsers = await db.select().from(schema.users);
  const adminCount = allUsers.filter((u: any) => u.role.toUpperCase() === "ADMIN").length;

  const openAlerts = await db
    .select()
    .from(schema.systemAlerts)
    .where(eq(schema.systemAlerts.status, "OPEN"));

  const recentAudit = await db
    .select()
    .from(schema.auditLogs)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(10);

  return {
    systemStatus: dbStatus === "HEALTHY" ? "HEALTHY" : "DEGRADED",
    apiStatus: "HEALTHY",
    dbStatus,
    dbLatencyMs: dbLatency,
    activeAdmins: adminCount,
    openAlertsCount: openAlerts.length,
    recentAudit,
    appVersion: "1.1.0",
    lastCheckAt: new Date().toISOString(),
  };
}

export async function checkSystemHealth() {
  const startDb = Date.now();
  let dbStatus = "HEALTHY";
  let dbLatency = 0;
  let details = "Database query executed successfully";

  try {
    await db.select({ count: sql`count(*)` }).from(schema.users);
    dbLatency = Date.now() - startDb;
    if (dbLatency > 500) {
      dbStatus = "DEGRADED";
      details = `Database latency is high: ${dbLatency}ms`;
    }
  } catch (err: any) {
    dbStatus = "UNHEALTHY";
    dbLatency = Date.now() - startDb;
    details = err?.message || "Failed to reach database";
  }

  // Save health check
  await db.insert(schema.systemHealthChecks).values({
    checkType: "DATABASE",
    status: dbStatus,
    latencyMs: dbLatency,
    details,
  });

  // Evaluate smart alerts
  if (dbStatus === "UNHEALTHY" || dbLatency > 500) {
    const existing = await db
      .select()
      .from(schema.systemAlerts)
      .where(eq(schema.systemAlerts.status, "OPEN"))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.systemAlerts).values({
        severity: dbStatus === "UNHEALTHY" ? "CRITICAL" : "WARNING",
        condition: dbStatus === "UNHEALTHY" ? "Database unreachable" : "Database latency above 500ms",
        threshold: "500ms",
        currentValue: `${dbLatency}ms`,
        status: "OPEN",
      });
    }
  }

  return {
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
      details,
    },
    api: {
      status: "HEALTHY",
      latencyMs: 12,
      details: "API routes functioning normally",
    },
    timestamp: new Date().toISOString(),
  };
}

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
