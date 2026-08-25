import { NextResponse } from "next/server";
import { getAuditLogs } from "@/server/services/superadmin.service";
import { requireSuperadmin } from "@/server/auth/session";

export async function GET() {
  try {
    await requireSuperadmin();
    const logs = await getAuditLogs();
    return NextResponse.json(logs);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status });
  }
}
