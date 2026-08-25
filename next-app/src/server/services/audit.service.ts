import { db } from "../db/connection";
import * as schema from "../db/schema";

export async function logAuditEvent(params: {
  userId?: string;
  userName?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
}) {
  try {
    await db.insert(schema.auditLogs).values({
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: params.details,
      ipAddress: params.ipAddress,
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}
