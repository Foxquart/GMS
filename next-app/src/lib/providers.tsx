"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 15s meant almost every navigation refetched everything it had
            // just fetched. A minute is still well inside a workshop's
            // tolerance for staleness, and mutations invalidate explicitly
            // anyway, so fresh data after an edit does not depend on this.
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            // Keep showing the previous page of results while the next one
            // loads, instead of dropping to a skeleton on every filter change.
            placeholderData: (prev: unknown) => prev,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}