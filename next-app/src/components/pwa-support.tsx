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
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ignore
      });
    }

    if (isIOS && !standalone) {
      const t = setTimeout(() => setShowIosHint(true), 3000);
      return () => clearTimeout(t);
    }
  }, [isIOS, standalone]);

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
      <div className="fixed inset-x-0 bottom-24 z-50 mx-4 max-w-sm rounded-2xl bg-white p-4 text-sm text-[#0f172a] shadow-xl border border-[#e2e8f0]">
        <p className="mb-1 font-semibold">Install Garage Manager</p>
        <p>
          Tap the <span className="mx-0.5 inline-block rounded bg-[#eef0f3] px-1.5">Share</span>{" "}
          button and choose{" "}
          <span className="mx-0.5 inline-block rounded bg-[#eef0f3] px-1.5">Add to Home Screen</span>.
        </p>
      </div>
    );
  }

  return null;
}