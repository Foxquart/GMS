import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/server/auth/session";

export async function GET() {
  try {
    await requireSuperadmin();
    return NextResponse.json({
      appVersion: "1.1.0",
      environment: process.env.NODE_ENV || "development",
      nextVersion: "16.3.1",
      usePglite: (process.env.USE_PGLITE ?? "true") === "true" || !process.env.DATABASE_URL,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status });
  }
}
