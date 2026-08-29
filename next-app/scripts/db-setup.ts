/**
 * Migrates and seeds the database. This is the only thing that does — starting
 * a server no longer touches the schema.
 *
 *   npm run db:setup
 *
 * PGlite is single-process: stop any running server first, or this refuses to
 * open the directory rather than corrupting it.
 */
import { ensureDbSetup } from "../src/server/db/connection";

const started = Date.now();
ensureDbSetup()
  .then(() => {
    console.log(`✔ database migrated and seeded in ${Date.now() - started} ms`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("✖ setup failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
