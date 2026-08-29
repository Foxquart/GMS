/**
 * Error thrown by `api()`.
 *
 * Carries the server's `code` and HTTP `status` alongside the message. The
 * previous version threw a bare Error with only the message, so callers that
 * needed to branch on a code (the categories page on CATEGORY_IN_USE) had to
 * hand-roll their own fetch. Anything that needs the code can now just catch.
 */
export class ApiClientError extends Error {
  status: number;
  code: string;
  /** Support reference for a server-side failure, when one was issued. */
  reference?: string;

  constructor(message: string, opts: { status: number; code: string; reference?: string }) {
    super(message);
    this.name = "ApiClientError";
    this.status = opts.status;
    this.code = opts.code;
    this.reference = opts.reference;
  }

  /** True when retrying the same request could plausibly succeed. */
  get isRetryable() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

/**
 * Last-resort wording, by status, for when the server could not say anything
 * useful itself. Every string here is written for the person holding the
 * phone, not for whoever reads the stack trace.
 */
function messageForStatus(status: number): string {
  if (status === 0) return "You appear to be offline. Check your connection and try again.";
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That could not be found. It may have been deleted.";
  if (status === 409) return "That conflicts with something already saved.";
  if (status === 413) return "That file or request is too large.";
  if (status === 429) return "Too many requests. Wait a moment and try again.";
  if (status === 504) return "That took too long. Try again in a moment.";
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return "That request could not be completed.";
}

export async function api<T = any>(
  path: string,
  options?: RequestInit & { params?: Record<string, string | undefined> },
): Promise<T> {
  let url = path;
  if (options?.params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined && v !== "") sp.set(k, v);
    }
    const qs = sp.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    // fetch only rejects for network-level failures — offline, DNS, CORS.
    throw new ApiClientError(messageForStatus(0), { status: 0, code: "NETWORK" });
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = json?.error;
    // Trust a server-supplied message: handleError guarantees it is safe to
    // show. Fall back to wording chosen from the status code.
    throw new ApiClientError(err?.message || messageForStatus(res.status), {
      status: res.status,
      code: err?.code ?? "ERROR",
      reference: err?.reference,
    });
  }

  return json?.data ?? json;
}

/** Narrow an unknown caught value to something safe to display. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

/** The support reference, when the failure carried one. */
export function errorReference(err: unknown): string | undefined {
  return err instanceof ApiClientError ? err.reference : undefined;
}
