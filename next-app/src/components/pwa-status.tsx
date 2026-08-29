"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { usePwaUpdate } from "@/hooks/use-pwa-update";

/**
 * Two pieces of state the workshop needs to know about and cannot see
 * otherwise: the network is gone, or a new version is sitting ready.
 *
 * Both sit at the top rather than the bottom, where the install card and the
 * mobile nav already live.
 */
export function PwaStatus() {
  const isOnline = useOnlineStatus();
  const { updateAvailable, applyUpdate } = usePwaUpdate();

  // Offline wins: an update cannot be applied without the network anyway.
  if (!isOnline) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-[var(--ochre)] px-4 py-2 text-center text-xs font-extrabold text-[var(--forest)]"
      >
        <WifiOff size={14} />
        You&apos;re offline — saved pages still work, new data won&apos;t load.
      </div>
    );
  }

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[var(--forest)] px-4 py-2 text-center text-xs font-extrabold text-[var(--ink-on-dark)]"
    >
      A new version of Garage Manager is ready.
      <button
        onClick={applyUpdate}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink-on-dark)] px-3 py-1 text-[var(--forest)] transition-opacity duration-150 ease-out hover:opacity-85"
      >
        <RefreshCw size={12} />
        Reload
      </button>
    </div>
  );
}
