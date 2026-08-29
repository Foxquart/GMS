"use client";

import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "pwa-hint-dismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // private mode / blocked storage — treat as not dismissed
    return false;
  }
}

export function PwaSupport() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  const [isIOS] = useState(
    () =>
      typeof window !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream,
  );
  const [standalone, setStandalone] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true),
  );

  // ── Service worker ─────────────────────────────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // An unregistered worker costs the app nothing but offline support.
      });
    } else {
      // In dev the chunk URLs are stable but their contents change on every
      // edit, so a cached worker serves stale JS against fresh server markup
      // and hydration blows up. Tear down leftovers from a production build.
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
    }
  }, []);

  // ── Install availability ───────────────────────────────────────────
  useEffect(() => {
    setDismissed(readDismissed());

    const onBeforeInstall = (e: Event) => {
      // Chrome's own mini-infobar is suppressed by this, so having taken it we
      // are now responsible for offering the install ourselves.
      e.preventDefault();
      setInstallPrompt(e);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setStandalone(true);
    };
    const display = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = (e: MediaQueryListEvent) => setStandalone(e.matches);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    display.addEventListener("change", onDisplayChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      display.removeEventListener("change", onDisplayChange);
    };
  }, []);

  // iOS has no beforeinstallprompt, so the only route is the Share sheet and
  // the only way to say so is to tell them. Delayed, so it does not land on
  // top of whatever they opened the app to do.
  useEffect(() => {
    if (!isIOS || standalone || dismissed) return;
    const t = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(t);
  }, [isIOS, standalone, dismissed]);

  const dismiss = useCallback(() => {
    setShowHint(false);
    setInstallPrompt(null);
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // stays dismissed for this session either way
    }
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    try {
      await installPrompt.userChoice;
    } catch {
      // Either outcome ends this prompt; the event cannot be reused.
    }
    setInstallPrompt(null);
  }, [installPrompt]);

  if (standalone || dismissed) return null;

  const showInstallButton = Boolean(installPrompt);
  const showIosInstructions = isIOS && showHint;
  if (!showInstallButton && !showIosInstructions) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--nav-inset)+0.75rem)] z-30 mx-4 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4 shadow-[var(--lift-2)] md:mx-auto md:max-w-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-[var(--ink)]">Install Garage Manager</p>
          {showInstallButton ? (
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
              Keep the workshop one tap away, with its own icon and no browser bar.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
              Tap{" "}
              <span className="mx-0.5 inline-block rounded bg-[var(--surface-sunk)] px-1.5 font-bold">
                Share
              </span>{" "}
              then{" "}
              <span className="mx-0.5 inline-block rounded bg-[var(--surface-sunk)] px-1.5 font-bold">
                Add to Home Screen
              </span>
              .
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 shrink-0 rounded-full p-2 text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {showInstallButton && (
        <button
          onClick={install}
          className="mt-3 w-full rounded-[var(--r-control)] bg-[var(--forest)] px-4 py-2.5 text-sm font-extrabold text-[var(--ink-on-dark)] transition-colors duration-150 ease-out hover:bg-[var(--forest-deep)]"
        >
          Install
        </button>
      )}
    </div>
  );
}
