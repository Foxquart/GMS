import { WifiOff } from "lucide-react";

/**
 * The service worker's navigation fallback. It has to be a static route with
 * no data of its own — it is served precisely when the network is gone, so
 * anything it needed to fetch would fail too.
 */
export const dynamic = "force-static";

export const metadata = { title: "Offline · Garage Manager" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--r-control)] bg-[var(--forest)] text-[var(--ink-on-dark)]">
          <WifiOff size={26} />
        </div>
        <h1 className="mt-5 text-xl font-extrabold tracking-tight text-[var(--ink)]">
          No connection
        </h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--ink-muted)]">
          Garage Manager needs the network to load jobs, parts and invoices. Pages you
          have already opened stay available.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-block w-full rounded-[var(--r-control)] bg-[var(--forest)] px-4 py-3 text-sm font-extrabold text-[var(--ink-on-dark)] transition-colors duration-150 ease-out hover:bg-[var(--forest-deep)]"
        >
          Try again
        </a>
      </div>
    </div>
  );
}
