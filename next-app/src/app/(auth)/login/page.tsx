"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button, Input, Field } from "@/components/ui";
import { SpotCone, SpotTools } from "@/components/illustrations";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      const message = err?.message ?? "Login failed";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-4 py-10">
      <div className="w-full max-w-md">
        {/* Wordmark sits outside the card, so the card is purely the task. */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--r-control)] bg-[var(--forest)] text-[var(--ink-on-dark)]">
            <Wrench size={21} />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-[var(--ink)]">Garage Manager</p>
            <p className="text-[11px] font-semibold text-[var(--ink-muted)]">Digital Workshop</p>
          </div>
        </div>

        <div className="isolate overflow-hidden rounded-[var(--r-panel)] border border-[var(--hairline)] bg-[var(--surface-bright)]">
          {/* Colour-blocked header band — the one hero element on this screen. */}
          <div className="relative flex items-end gap-3 bg-[var(--sage)] px-6 pb-5 pt-6">
            <div className="min-w-0 flex-1">
              <p className="tile-label text-[var(--forest)]/65">Workshop sign-in</p>
              <h1 className="mt-1.5 text-[clamp(1.5rem,7vw,2rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--forest)]">
                Open up the shop
              </h1>
              <p className="mt-2 text-sm font-semibold leading-snug text-[var(--forest)]/70">
                Today&apos;s jobs, parts and invoices are waiting.
              </p>
            </div>
            <SpotTools size={92} className="-mb-1 shrink-0 text-[var(--forest)]" />
          </div>

          <form onSubmit={submit} className="space-y-4 p-6" noValidate>
            <AnimatePresence initial={false}>
              {formError && (
                <motion.div
                  key="login-error"
                  role="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.22, 0.9, 0.32, 1] }}
                  className="flex items-start gap-3 rounded-[var(--r-control)] border border-[var(--terracotta)]/25 bg-[var(--terracotta)]/8 p-3"
                >
                  <SpotCone size={34} className="-mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-[var(--terracotta-hover)]">
                      That didn&apos;t sign you in
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-muted)]">
                      {formError}. Check the email and password, then try again.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Field label="Email">
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="you@yourgarage.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={formError ? true : undefined}
                disabled={loading}
                required
              />
            </Field>

            <Field label="Password">
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="Your password"
                autoComplete="current-password"
                aria-invalid={formError ? true : undefined}
                disabled={loading}
                required
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              className="mt-1 w-full"
              disabled={loading || !email || !password}
            >
              {loading ? "Signing you in…" : "Sign in"}
            </Button>

            <p className="pt-1 text-center text-xs leading-relaxed text-[var(--ink-muted)]">
              One account per workshop. Ask your workshop owner if you need access.
            </p>
          </form>
        </div>

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-4 rounded-[var(--r-control)] border border-dashed border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-center text-xs text-[var(--ink-muted)]">
            Development seed account:{" "}
            <strong className="font-bold text-[var(--ink)]">admin@garage.com</strong> /{" "}
            <strong className="font-bold text-[var(--ink)]">admin123</strong>
          </div>
        )}
      </div>
    </div>
  );
}
