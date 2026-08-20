import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { handleError, ok, ApiError } from "@/server/lib/http";
import { getJob, updateJob, addLabour, removeLabour, saveJobPart, removeJobPart } from "@/server/services/job.service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    return ok(await getJob(id));
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await ctx.params;
    const body = await request.json();

    if (body?.action === "add-labour") {
      const desc = String(body.description ?? "").trim();
      const amount = Number(body.amount);
      if (!desc || !amount) throw new ApiError(400, "Labour description and amount are required");
      return ok(await addLabour(id, { description: desc, amount }));
    }
    if (body?.action === "remove-labour") {
      return ok(await removeLabour(id, String(body.labourId)));
    }
    if (body?.action === "add-part") {
      if (!body.partId) throw new ApiError(400, "Part is required");
      return ok(await saveJobPart(id, { partId: String(body.partId), quantity: Number(body.quantity ?? 1) }));
    }
    if (body?.action === "remove-part") {
      return ok(await removeJobPart(id, String(body.jobPartId)));
    }

    return ok(
      await updateJob(id, {
        status: body.status !== undefined ? String(body.status) : undefined,
        complaint: body.complaint !== undefined ? String(body.complaint) : undefined,
        workNotes: body.workNotes !== undefined ? String(body.workNotes) : undefined,
        odometerReading: body.odometerReading !== undefined ? String(body.odometerReading) : undefined,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}