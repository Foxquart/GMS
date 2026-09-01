"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Wrench } from "lucide-react";
import { ApiClientError, api, errorMessage, errorReference } from "@/lib/api";
import { Button, Input, Field } from "@/components/ui";
import { SpotCone, SpotTools } from "@/components/illustrations";

/**
 * What the person in front of the screen is told when a sign-in fails.
 *
 * One error, written per case. A 401 never says which of the two fields was
 * wrong — that would confirm to anyone guessing that an address is registered.
 * A server-side failure carries its reference, because this is the screen
 * where someone has nothing else to quote when they ask for help.
 */
type LoginFailure = {
  title: string;
  detail: string;
  reference?: string;
  /** Whether the fields themselves are what the person should re-check. */
  fieldsAtFault: boolean;
};

function describeFailure(err: unknown): LoginFailure {
  const status = err instanceof ApiClientError ? err.status : undefined;

  if (status === 0) {
    return {
      title: "You appear to be offline",
      detail: "Check your connection, then try signing in again.",
      fieldsAtFault: false,
    };
  }

  if (status === 401) {
    return {
      title: "That email and password don't match.",
      detail:
        "Check both and try again. If you are sure they are right, ask your workshop owner whether your account is still active.",
      fieldsAtFault: true,
    };
  }

  if (status === 429) {
    // The server says how long to wait — that number is the whole message.
    return {
      title: "Too many sign-in attempts",
      detail: errorMessage(err),
      fieldsAtFault: false,
    };
  }

  if (status !== undefined && status >= 500) {
    return {
      title: "We couldn't sign you in",
      detail: errorMessage(err),
      reference: errorReference(err),
      fieldsAtFault: false,
    };
  }

  return {
    title: "That didn't sign you in",
    detail: errorMessage(err),
    fieldsAtFault: status === 400,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<LoginFailure | null>(null);

  // Editing either field is the person answering the error, so it goes away.
  const clearFailure = () => setFailure((prev) => (prev ? null : prev));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFailure(null);
    try {
      const user = await api<{ role?: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      // A superadmin has no workshop pages to land on — sending them to
      // /dashboard only to be bounced back shows a page they cannot use.
      router.push(user?.role?.toUpperCase() === "SUPERADMIN" ? "/superadmin" : "/dashboard");
      router.refresh();
    } catch (err) {
      // One error, inline, where the fields are. No toast as well — the same
      // failure told twice reads as two failures.
      setFailure(describeFailure(err));
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
              {failure && (
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
                      {failure.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-muted)]">
                      {failure.detail}
                    </p>
                    {failure.reference && (
                      <p className="tile-label mt-1.5 text-[var(--ink-label)]">
                        Reference {failure.reference}
                      </p>
                    )}
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
                  clearFailure();
                }}
                placeholder="you@yourgarage.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={failure?.fieldsAtFault ? true : undefined}
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
                  clearFailure();
                }}
                placeholder="Your password"
                autoComplete="current-password"
                aria-invalid={failure?.fieldsAtFault ? true : undefined}
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
