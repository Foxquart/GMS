import { NextResponse } from "next/server";
import { toggleAdminStatus, deleteAdminUser } from "@/server/services/superadmin.service";
import { requireSuperadmin } from "@/server/auth/session";
import { logAuditEvent } from "@/server/services/audit.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperadmin();
    const { id } = await params;
    const body = await req.json();

    const updated = await toggleAdminStatus(id, Boolean(body.isActive));

    await logAuditEvent({
      userId: session.userId,
      userName: session.email,
      action: body.isActive ? "ENABLE_ADMIN" : "DISABLE_ADMIN",
      resourceType: "USER",
      resourceId: id,
      details: `Admin ${id} active status set to ${body.isActive}`,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperadmin();
    const { id } = await params;

    await deleteAdminUser(id);

    await logAuditEvent({
      userId: session.userId,
      userName: session.email,
      action: "DELETE_ADMIN",
      resourceType: "USER",
      resourceId: id,
      details: `Deleted admin user ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status });
  }
}
