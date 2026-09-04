import { afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Each vitest worker gets an isolated PGlite data dir so service tests
// don't touch the developer's local .pglite database.
const dir = mkdtempSync(path.join(tmpdir(), "gms-test-"));
process.env.PGLITE_DATA_DIR = dir;

/**
 * Pin the *engine*, not just the directory.
 *
 * `resetBusinessData()` issues an unfiltered DELETE against every business
 * table. Isolating PGLITE_DATA_DIR is worthless if the connection never uses
 * PGlite at all: `usePglite` in connection.ts falls back to Postgres the moment
 * a DATABASE_URL is present, so a developer with one exported, or CI with one
 * configured, would run the suite — and its DELETEs — against a real database.
 *
 * Both lines are needed: USE_PGLITE=true alone is not enough, because the
 * check also ORs on `!DATABASE_URL`. Set before connection.ts is imported,
 * which is why this lives in setupFiles.
 */
process.env.USE_PGLITE = "true";
delete process.env.DATABASE_URL;

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});