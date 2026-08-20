import { afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Each vitest worker gets an isolated PGlite data dir so service tests
// don't touch the developer's local .pglite database.
const dir = mkdtempSync(path.join(tmpdir(), "gms-test-"));
process.env.PGLITE_DATA_DIR = dir;

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});