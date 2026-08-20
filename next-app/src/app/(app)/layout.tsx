import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#f1f3f5] text-[#0f172a]">
      <AppNav />
      <main className="pt-4 pb-20 md:pl-64 md:pt-6 md:pb-8 px-4 md:px-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}