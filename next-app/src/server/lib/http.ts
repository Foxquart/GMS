import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "BAD_REQUEST") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(status: number, message: string, code?: string) {
  return NextResponse.json(
    { success: false, error: { code: code ?? "ERROR", message } },
    { status },
  );
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return fail(err.status, err.message, err.code);
  }
  if (err instanceof Error) {
    if (process.env.NODE_ENV === "production") {
      console.error("[api] internal error:", err);
      return fail(500, "Something went wrong", "INTERNAL_ERROR");
    }
    return fail(500, err.message, "INTERNAL_ERROR");
  }
  return fail(500, "Something went wrong", "INTERNAL_ERROR");
}