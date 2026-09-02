/**
 * Are the two inventory locations present?
 *
 * Every stock write resolves SHOP or WAREHOUSE by code, so a database missing
 * them fails on the first "add a part with opening stock" with a 500 while
 * every read still looks healthy. `npm run db:setup` creates them.
 */
import { db } from "@/server/db/connection";

(async () => {
  const rows = (await db.execute("select code, name from inventory_locations order by code")).rows ?? [];
  console.log(`inventory_locations: ${rows.length} row(s)`);
  for (const r of rows as any[]) console.log(`  ${r.code} — ${r.name}`);
  const codes = new Set((rows as any[]).map((r) => r.code));
  const missing = ["SHOP", "WAREHOUSE"].filter((c) => !codes.has(c));
  console.log(missing.length ? `MISSING: ${missing.join(", ")} → run: npm run db:setup` : "OK — both present");
  process.exit(0);
})();
