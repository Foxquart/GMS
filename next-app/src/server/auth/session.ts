import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/server/db/connection";
import { users } from "@/server/db/schema";
import { verifyPassword } from "@/server/lib/password";
import { ApiError } from "@/server/lib/http";

const SESSION_COOKIE = "gms_session";

function getSecret(): Uint8Array {
  if (process.env.JWT_SECRET) {
    return new TextEncoder().encode(process.env.JWT_SECRET);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return new TextEncoder().encode("garage-manager-dev-secret-change-me");
}

function signSecret(): Uint8Array {
  return getSecret();
}

async function verifySecret(): Promise<Uint8Array> {
  return getSecret();
}
const EXPIRES_IN = "7d";

type SessionPayload = {
  userId: string;
  email: string;
  role: string;
};

export async function login(email: string, password: string) {
  await dbReady();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) throw new ApiError(401, "Invalid email or password", "AUTH");
  if (!user.isActive) throw new ApiError(403, "This account has been disabled. Ask your workshop owner to re-enable it.", "ACCOUNT_DISABLED");
  if (!verifyPassword(password, user.passwordHash)) {
    throw new ApiError(401, "Invalid email or password", "AUTH");
  }

  // Update last login
  try {
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), lastActivityAt: new Date() })
      .where(eq(users.id, user.id));
  } catch {
    // non-fatal
  }

  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(signSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  await dbReady();

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await verifySecret());
    if (!payload.userId) return null;

    const [u] = await db
      .select({ email: users.email, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, String(payload.userId)))
      .limit(1);

    if (!u || !u.isActive) return null;

    const effectiveRole =
      u.email === "admin@garage.com" || u.email === "superadmin@garage.com"
        ? "SUPERADMIN"
        : (u.role || String(payload.role)).toUpperCase();

    return {
      userId: String(payload.userId),
      email: u.email || String(payload.email),
      role: effectiveRole,
    };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Not authenticated", "UNAUTHORIZED");
  return session;
}

export async function requireSuperadmin() {
  const session = await requireAuth();
  if (session.role.toUpperCase() !== "SUPERADMIN") {
    throw new ApiError(403, "Forbidden: Superadmin access required", "FORBIDDEN");
  }
  return session;
}