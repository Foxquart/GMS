import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    return new TextEncoder().encode("garage-manager-dev-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function createShareToken(invoiceId: string): Promise<string> {
  return new SignJWT({ scope: "invoice-share", invoiceId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyShareToken(
  token: string,
): Promise<{ invoiceId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.scope !== "invoice-share" || !payload.invoiceId) return null;
    return { invoiceId: String(payload.invoiceId) };
  } catch {
    return null;
  }
}