"use client";

import { useEffect, useState } from "react";

/**
 * Detects a service worker that has installed but is waiting to take over.
 *
 * The worker deliberately does not call `skipWaiting()` on install: swapping
 * the JS underneath a running session is how you get a half-updated app and
 * hydration errors. It waits, and this offers the swap at a moment the person
 * chose.
 */
export function usePwaUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    navigator.serviceWorker.ready.then((reg) => {
      if (cancelled) return;

      // A worker may already be waiting from a previous visit.
      if (reg.waiting) setWaiting(reg.waiting);

      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          // `controller` is null on the very first install — that is not an
          // update, it is the worker taking over for the first time.
          if (next.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(next);
          }
        });
      });
    });

    // The new worker calling clients.claim() after skipWaiting lands here.
    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    waiting?.postMessage({ type: "SKIP_WAITING" });
    setWaiting(null);
  };

  return { updateAvailable: waiting !== null, applyUpdate };
}
