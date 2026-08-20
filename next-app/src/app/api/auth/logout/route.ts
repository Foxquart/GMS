import { logout } from "@/server/auth/session";
import { ok } from "@/server/lib/http";

export async function POST() {
  await logout();
  return ok({ message: "Logged out" });
}