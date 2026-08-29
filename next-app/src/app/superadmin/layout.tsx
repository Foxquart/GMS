import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { SuperadminShell } from "./superadmin-shell";

/**
 * The console is operator-only, and that is settled on the server before any
 * of it is sent. Checking in the browser meant the chrome painted first and
 * an admin who typed the URL got a refusal card on a page they had already
 * been served — the shape of the console, its section names and the operator
 * bar included.
 */
export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role.toUpperCase() !== "SUPERADMIN") redirect("/dashboard");

  return <SuperadminShell email={session.email}>{children}</SuperadminShell>;
}
