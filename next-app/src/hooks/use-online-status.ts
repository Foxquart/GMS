"use client";

import { useEffect, useState } from "react";

/**
 * Starts optimistic. `navigator.onLine` is unavailable during SSR, and
 * assuming "offline" would flash the banner on every first paint.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  return isOnline;
}
