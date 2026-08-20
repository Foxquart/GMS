import { NextRequest } from "next/server";
import { login } from "@/server/auth/session";
import { ApiError, handleError, ok } from "@/server/lib/http";
import { checkRateLimit, clearRateLimit } from "@/server/lib/rate-limit";

function ipFrom(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }
    const ip = ipFrom(request);
    checkRateLimit(`login:${ip}:${email}`);
    const user = await login(email, password);
    clearRateLimit(`login:${ip}:${email}`);
    return ok(user);
  } catch (err) {
    return handleError(err);
  }
}