import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  // A superadmin operates the platform, not a workshop. The console is the
  // whole of their app, so every page in here sends them back to it.
  if (session.role.toUpperCase() === "SUPERADMIN") {
    redirect("/superadmin");
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <AppNav />
      {/* lg:pl-72 clears the persistent sidebar; below that the drawer
          overlays instead, so the content keeps the full width. */}
      {/* The sidebar offset and the reading-width cap must live on separate
          elements — on one element, mx-auto centres the padded box and pushes
          content away from the sidebar by half the leftover space. */}
      <main id="main" className="lg:pl-72">
        <div className="mx-auto max-w-5xl px-4 pt-5 pb-[calc(var(--nav-inset)+2rem)] lg:px-8 lg:pt-8 lg:pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
