import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";

/** Each role has its own home; "/" is just the fork between them. */
export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.role.toUpperCase() === "SUPERADMIN" ? "/superadmin" : "/dashboard");
}
