import { NextResponse } from "next/server";
import { listAdmins, createAdminUser } from "@/server/services/superadmin.service";
import { requireSuperadmin } from "@/server/auth/session";
import { logAuditEvent } from "@/server/services/audit.service";

export async function GET() {
  try {
    await requireSuperadmin();
    const admins = await listAdmins();
    return NextResponse.json(admins);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSuperadmin();
    const body = await req.json();

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const newAdmin = await createAdminUser(body);

    await logAuditEvent({
      userId: session.userId,
      userName: session.email,
      action: "CREATE_ADMIN",
      resourceType: "USER",
      resourceId: newAdmin.id,
      details: `Created admin user: ${newAdmin.email} with role ${newAdmin.role}`,
    });

    return NextResponse.json(newAdmin, { status: 201 });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status });
  }
}
