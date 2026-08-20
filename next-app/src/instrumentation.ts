export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    try {
      // Deferred import so the DB (and PGlite) is not instantiated during
      // build-time static generation in every worker.
      const { ensureDbSetup } = await import("@/server/db/connection");
      await ensureDbSetup();
    } catch (err) {
      console.error("❌ DB setup failed:", err);
    }
  }
}