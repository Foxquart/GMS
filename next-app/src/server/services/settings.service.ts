import { eq } from "drizzle-orm";
import { db } from "@/server/db/connection";
import { settings } from "@/server/db/schema";

export async function getSettings() {
  const [row] = await db.select().from(settings).limit(1);
  return row ?? null;
}

export async function updateSettings(input: {
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  invoicePrefix?: string;
  invoiceTerms?: string;
}) {
  const [existing] = await db.select().from(settings).limit(1);
  if (existing) {
    const [row] = await db
      .update(settings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(settings.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db.insert(settings).values(input as any).returning();
  return row;
}