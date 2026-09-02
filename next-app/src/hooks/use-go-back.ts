"use client";

import { useRouter } from "next/navigation";

/**
 * A back control that cannot walk out of the app.
 *
 * `router.back()` on its own goes to whatever the browser visited before this
 * page — and when this page *is* the first entry, that is somewhere outside the
 * workshop entirely. That is not an edge case: it happens on a bookmark, on a
 * refresh, on a link opened from WhatsApp, and every time the installed PWA
 * reopens on the screen it was last closed on. The back arrow then either does
 * nothing or leaves the app, which is worse than having no arrow at all.
 *
 * `history.length <= 1` is exactly that situation, and the fallback is the
 * honest destination for it — the list this record belongs to, or the
 * dashboard for a page that has no parent.
 *
 *   const goBack = useGoBack("/customers");
 */
export function useGoBack(fallback = "/dashboard") {
  const router = useRouter();
  return () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  };
}
