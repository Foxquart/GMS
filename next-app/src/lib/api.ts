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

  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json?.data ?? json;
}