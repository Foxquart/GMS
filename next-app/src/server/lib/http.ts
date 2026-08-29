import { NextResponse } from "next/server";

/**
 * An error we deliberately wrote for a person to read. Anything thrown as an
 * ApiError is considered safe to show verbatim in the UI.
 */
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

export function fail(
  status: number,
  message: string,
  code?: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    { success: false, error: { code: code ?? "ERROR", message, ...extra } },
    { status },
  );
}

/** Short, human-quotable id so a support report can be tied to a server log. */
function referenceId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Postgres error codes worth turning into something a person can act on,
 * rather than letting them fall through to a generic failure.
 */
function fromDatabaseError(err: unknown): { status: number; message: string; code: string } | null {
  const pgCode = (err as { code?: unknown } | null)?.code;
  if (typeof pgCode !== "string") return null;

  switch (pgCode) {
    case "23505": // unique_violation
      return {
        status: 409,
        message: "That already exists. Use a different value and try again.",
        code: "DUPLICATE",
      };
    case "23503": // foreign_key_violation
      return {
        status: 409,
        message: "Something else is still linked to this, so it cannot be changed yet.",
        code: "IN_USE",
      };
    case "23502": // not_null_violation
      return { status: 400, message: "A required field is missing.", code: "MISSING_FIELD" };
    case "22P02": // invalid_text_representation — usually a malformed uuid in a URL
      return { status: 400, message: "That link or id is not valid.", code: "BAD_INPUT" };
    case "57014": // query_canceled
      return {
        status: 504,
        message: "That took too long and was stopped. Try again in a moment.",
        code: "TIMEOUT",
      };
    case "ECONNREFUSED":
    case "08006":
    case "08003":
      return {
        status: 503,
        message: "Can't reach the database right now. Try again in a moment.",
        code: "DB_UNAVAILABLE",
      };
    default:
      return null;
  }
}

/**
 * The only place an unexpected error becomes an HTTP response.
 *
 * Internal detail is NEVER returned to the client — it previously echoed
 * `err.message` outside production, which put raw SQL (table and column names
 * included) straight into the login screen. Detail goes to the server log
 * against a reference id; the client gets a sentence and that id.
 */
export function handleError(err: unknown) {
  // Deliberate, human-written errors pass through untouched.
  if (err instanceof ApiError) {
    return fail(err.status, err.message, err.code);
  }

  const known = fromDatabaseError(err);
  if (known) {
    console.error("[api]", known.code, err);
    return fail(known.status, known.message, known.code);
  }

  const ref = referenceId();
  console.error(`[api] unhandled error ref=${ref}`, err);
  return fail(
    500,
    "Something went wrong on our end. Please try again.",
    "INTERNAL_ERROR",
    { reference: ref },
  );
}
