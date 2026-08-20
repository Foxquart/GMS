import { ApiError } from "@/server/lib/http";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    throw new ApiError(429, `Too many attempts. Try again in ${retryAfter}s.`, "RATE_LIMITED");
  }

  entry.count += 1;
}

export function clearRateLimit(key: string) {
  attempts.delete(key);
}