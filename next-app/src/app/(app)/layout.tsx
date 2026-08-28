import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <AppNav />
      {/* pb clears the floating nav pill on mobile; --nav-inset is 0 on desktop. */}
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-[calc(var(--nav-inset)+1.5rem)] md:px-8 md:pt-8 md:pb-10 md:pl-72">
        {children}
      </main>
    </div>
  );
}
