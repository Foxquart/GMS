import { NextResponse } from "next/server";
import { checkSystemHealth, getSuperadminOverview } from "@/server/services/superadmin.service";
import { requireSuperadmin } from "@/server/auth/session";

export async function GET() {
  try {
    await requireSuperadmin();
    const health = await checkSystemHealth();
    const overview = await getSuperadminOverview();
    return NextResponse.json({ ...health, overview });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status });
  }
}
