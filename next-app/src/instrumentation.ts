export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  // Fail loudly at boot rather than as a generic 500 on every sign-in. This
  // one cost real debugging time: `next start` runs as production, the app
  // refuses a default signing secret there, and the only trace was a
  // reference code in the server log.
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    console.error(
      "❌ JWT_SECRET is not set. Sign-in will fail with a 500 on every attempt.\n" +
        "   Set it in .env.local for a local `next start`, or in the host's environment.",
    );
  }

  try {
    // Deferred import so the DB (and PGlite) is not instantiated during
    // build-time static generation in every worker.
    const { dbReady } = await import("@/server/db/connection");
    // Warms the connection and checks the schema is present. It does not
    // migrate or seed — that is `npm run db:setup`, run deliberately.
    await dbReady();
  } catch (err) {
    console.error("❌ Database not ready:", err instanceof Error ? err.message : err);
  }
}
