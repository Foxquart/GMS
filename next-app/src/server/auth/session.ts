import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/connection";
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
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) throw new ApiError(401, "Invalid email or password", "AUTH");
  if (!user.isActive) throw new ApiError(401, "Account is disabled", "AUTH");
  if (!verifyPassword(password, user.passwordHash)) {
    throw new ApiError(401, "Invalid email or password", "AUTH");
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
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await verifySecret());
    if (!payload.userId) return null;
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      role: String(payload.role),
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