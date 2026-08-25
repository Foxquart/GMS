import { NextResponse } from "next/server";
import { getSystemAlerts } from "@/server/services/superadmin.service";
import { requireSuperadmin } from "@/server/auth/session";

export async function GET() {
  try {
    await requireSuperadmin();
    const alerts = await getSystemAlerts();
    return NextResponse.json(alerts);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status });
  }
}
