"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button, Input, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f1f3f5] px-4 py-8 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#5865f2]/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#16a34a]/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5865f2] text-white shadow-xl shadow-[#5865f2]/30 transition-transform hover:scale-105">
            <Wrench size={30} />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#16a34a] ring-2 ring-white">
              <Sparkles size={11} className="text-white" />
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a] flex items-center gap-2">
            Welcome back!
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">We&apos;re so excited to see you again!</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-xl"
        >
          <Field label="Email or Username">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@garage.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" className="w-full h-11 text-base font-bold" size="lg" disabled={loading}>
            {loading ? "Signing in..." : "Log In"}
          </Button>
        </form>

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#64748b] bg-white py-2.5 px-4 rounded-xl border border-[#e2e8f0]">
            <ShieldCheck size={14} className="text-[#5865f2]" />
            <span>Default: <strong className="text-[#0f172a]">admin@garage.com</strong> / <strong className="text-[#0f172a]">admin123</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}