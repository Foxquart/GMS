"use client";

import { useEffect, useState } from "react";

export function PwaSupport() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [isIOS] = useState(
    () =>
      typeof window !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream,
  );
  const [standalone] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true),
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // ignore
        });
      } else {
        // In dev the chunk URLs are stable but their contents change on every
        // edit, so a cached worker serves stale JS against fresh server markup
        // and hydration blows up. Tear down leftovers from a production build.
        navigator.serviceWorker.getRegistrations().then((rs) => {
          rs.forEach((r) => r.unregister());
        });
        if ("caches" in window) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }
      }
    }

    // Asking again after someone has closed it is the definition of nagging.
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("pwa-hint-dismissed") === "1";
    } catch {
      // private mode / blocked storage — just show it
    }

    if (isIOS && !standalone && !dismissed) {
      const t = setTimeout(() => setShowIosHint(true), 3000);
      return () => clearTimeout(t);
    }
  }, [isIOS, standalone]);

  const dismissHint = () => {
    setShowIosHint(false);
    try {
      localStorage.setItem("pwa-hint-dismissed", "1");
    } catch {
      // stays dismissed for this session either way
    }
  };

  const onBeforeInstall = (e: Event) => {
    e.preventDefault();
    setInstallPrompt(e);
  };

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (standalone || installPrompt) return null;

  if (isIOS) {
    if (!showIosHint) return null;
    return (
      <div className="fixed inset-x-0 bottom-[calc(var(--nav-inset)+0.75rem)] z-30 mx-4 rounded-[var(--r-tile)] border border-[var(--hairline)] bg-[var(--surface-bright)] p-4 shadow-[var(--lift-2)] md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[var(--ink)]">Install Garage Manager</p>
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
          </div>
          <button
            onClick={dismissHint}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 shrink-0 rounded-full p-2 text-[var(--ink-muted)] transition-colors duration-150 ease-out hover:bg-[var(--surface-sunk)] hover:text-[var(--ink)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
}