/**
 * DB doctor — one command, menu driven.
 *
 *   npm run manage-db        (or: bun run manage-db)
 *
 * Reads the database from .env / .env.local automatically — the same way
 * `npm run users` does — so there is nothing to pass in.
 *
 * What it checks:
 *   1. connection        can we reach the database at all
 *   2. env               JWT_SECRET / DATABASE_URL sanity for production
 *   3. schema            tables exist (migrations applied)
 *   4. stock locations   SHOP + WAREHOUSE rows (the 503 LOCATIONS_MISSING bug)
 *   5. settings          workshop settings row
 *   6. categories        at least the defaults exist
 *   7. users             someone can log in; default seed logins flagged
 *
 * Every issue found asks before it is fixed. Nothing is changed silently.
 */
import readline from "node:readline";
import { eq, sql } from "drizzle-orm";
import {
  db,
  describeDbTarget,
  ensureDbSetup,
  isPglite,
} from "../src/server/db/connection";
import * as schema from "../src/server/db/schema";
import { seedDefaultCategories } from "../src/server/services/category.service";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (ans) => resolve(ans.trim()));
  });
}

async function askChoice(question: string, options: string[]): Promise<string> {
  const hint = options.map((o, i) => `${i + 1}) ${o}`).join("  ");
  for (;;) {
    const ans = await ask(`${question} [${hint}]: `);
    const idx = Number(ans);
    if (Number.isInteger(idx) && idx >= 1 && idx <= options.length) return options[idx - 1];
    const match = options.find((o) => o.toLowerCase() === ans.toLowerCase());
    if (match) return match;
    console.log(`  pick one of: ${options.join(", ")} (or 1-${options.length})`);
  }
}

async function askYesNo(question: string): Promise<boolean> {
  const ans = (await ask(`${question} [y/N]: `)).toLowerCase();
  return ans === "y" || ans === "yes";
}

/** Credentials shipped in git history — fine for dev, a hole in production. */
const DEV_LOGINS = ["admin@garage.com", "superadmin@garage.com"];

type Status = { ok: boolean; detail: string };
type Check = {
  key: string;
  label: string;
  run: () => Promise<Status>;
  fix?: () => Promise<string>;
  fixNote?: string;
};

async function countRows(table: string): Promise<number> {
  const res: any = await db.execute(sql.raw(`select count(*)::int as c from "${table}"`));
  return Number((res.rows ?? res)[0]?.c ?? 0);
}

const checks: Check[] = [
  {
    key: "connection",
    label: "connection",
    run: async () => {
      try {
        await db.execute(sql`select 1`);
        return { ok: true, detail: "database answers" };
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        let hint = msg;
        if (msg.includes("already open by process")) {
          hint =
            `${msg}\n      PGlite allows one process at a time — stop the running server (or seed run) first.`;
        } else if (isPglite()) {
          hint = `${msg}\n      Embedded DB failed — the .pglite directory may be corrupt (restore or delete it and re-run db:setup).`;
        } else {
          hint =
            `${msg}\n      Is Postgres running? Is DATABASE_URL in .env.local correct (host, port, user, password, db name)?`;
        }
        return { ok: false, detail: hint };
      }
    },
  },
  {
    key: "env",
    label: "environment",
    run: async () => {
      const problems: string[] = [];
      if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
        problems.push("JWT_SECRET is missing — every login will 500 in production");
      }
      if (!isPglite() && !process.env.DATABASE_URL) {
        problems.push("USE_PGLITE=false but DATABASE_URL is not set");
      }
      if (isPglite() && process.env.NODE_ENV === "production") {
        problems.push("production is running on embedded PGlite, not Postgres (data lives in .pglite on this machine only)");
      }
      return problems.length
        ? { ok: false, detail: problems.join("; ") }
        : { ok: true, detail: `JWT_SECRET ${process.env.JWT_SECRET ? "set" : "not set (dev auto-key)"}, target sane` };
    },
  },
  {
    key: "schema",
    label: "schema (migrations applied)",
    run: async () => {
      try {
        const res: any = await db.execute(sql`select to_regclass('public.users') as t`);
        const present = (res.rows ?? res)[0]?.t;
        return present
          ? { ok: true, detail: "tables exist" }
          : { ok: false, detail: "tables missing — migrations were never applied to this database" };
      } catch (err) {
        return { ok: false, detail: `could not inspect schema: ${err instanceof Error ? err.message : err}` };
      }
    },
    fixNote: "runs the pending migrations and seeds the essentials (also re-creates the public seed logins — see users check)",
    fix: async () => {
      await ensureDbSetup();
      return "migrations applied and essentials seeded";
    },
  },
  {
    key: "locations",
    label: "stock locations (SHOP + WAREHOUSE)",
    run: async () => {
      try {
        const rows: any = await db
          .select({ code: schema.inventoryLocations.code })
          .from(schema.inventoryLocations);
        const codes = rows.map((r: any) => r.code);
        const missing = ["SHOP", "WAREHOUSE"].filter((c) => !codes.includes(c));
        return missing.length
          ? { ok: false, detail: `missing: ${missing.join(", ")} — every stock write 503s without these` }
          : { ok: true, detail: "SHOP and WAREHOUSE present" };
      } catch (err) {
        return { ok: false, detail: `could not read locations: ${err instanceof Error ? err.message : err}` };
      }
    },
    fixNote: "re-inserts only the missing rows (safe — existing data untouched)",
    fix: async () => {
      await db
        .insert(schema.inventoryLocations)
        .values([
          { name: "Main Shop", code: "SHOP", locationType: "SHOP" },
          { name: "Main Warehouse", code: "WAREHOUSE", locationType: "WAREHOUSE" },
        ] as any)
        .onConflictDoNothing({ target: schema.inventoryLocations.code });
      return "stock locations restored — restart is NOT needed, retry the failed request";
    },
  },
  {
    key: "settings",
    label: "workshop settings",
    run: async () => {
      try {
        const rows = await db.select().from(schema.settings).limit(1);
        return rows.length
          ? { ok: true, detail: `present ("${(rows[0] as any).businessName}")` }
          : { ok: false, detail: "settings row missing — settings page and invoice header fall back to blanks" };
      } catch (err) {
        return { ok: false, detail: `could not read settings: ${err instanceof Error ? err.message : err}` };
      }
    },
    fix: async () => {
      const existing = await db.select().from(schema.settings).limit(1);
      if (existing.length) return "settings already present — nothing to do";
      const name = (await ask("  business name [My Workshop]: ")) || "My Workshop";
      const phone = await ask("  business phone (blank ok): ");
      const prefix = (await ask("  invoice prefix [INV]: ")) || "INV";
      await db.insert(schema.settings).values({
        businessName: name,
        businessPhone: phone,
        businessAddress: "",
        invoicePrefix: prefix,
        invoiceTerms: "Payment due upon invoice generation. Thank you for your business!",
      });
      return "settings row created — adjust the rest in the app's Settings page";
    },
  },
  {
    key: "categories",
    label: "part categories",
    run: async () => {
      try {
        const n = await countRows("categories");
        return n > 0
          ? { ok: true, detail: `${n} categories` }
          : { ok: false, detail: "none — parts cannot be added without a category" };
      } catch (err) {
        return { ok: false, detail: `could not read categories: ${err instanceof Error ? err.message : err}` };
      }
    },
    fixNote: "seeds the 7 defaults, and only when the table is empty (never resurrects one you deleted)",
    fix: async () => {
      const seeded = await seedDefaultCategories(db);
      return seeded ? `seeded ${seeded} default categories` : "categories already present — nothing to do";
    },
  },
  {
    key: "users",
    label: "users (someone can log in)",
    run: async () => {
      try {
        const rows = (await db
          .select({ email: schema.users.email, role: schema.users.role, isActive: schema.users.isActive })
          .from(schema.users)) as { email: string; role: string; isActive: boolean }[];
        if (!rows.length) return { ok: false, detail: "no users at all — nobody can log in" };
        const active = rows.filter((r) => r.isActive);
        if (!active.length) return { ok: false, detail: `${rows.length} user(s) but all disabled — nobody can log in` };
        const seeds = active.filter((r) => DEV_LOGINS.includes(r.email.toLowerCase()));
        if (seeds.length) {
          return {
            ok: false,
            detail: `${active.length} active login(s), but these use PUBLIC passwords from git history: ${seeds.map((s) => s.email).join(", ")}`,
          };
        }
        return { ok: true, detail: `${active.length} active login(s), no public seed credentials` };
      } catch (err) {
        return { ok: false, detail: `could not read users: ${err instanceof Error ? err.message : err}` };
      }
    },
    fixNote: "disables the public seed logins (reversible — use `npm run users` to delete them or manage accounts)",
    fix: async () => {
      const rows = (await db
        .select({ id: schema.users.id, email: schema.users.email, isActive: schema.users.isActive })
        .from(schema.users)) as { id: string; email: string; isActive: boolean }[];
      const seeds = rows.filter((r) => r.isActive && DEV_LOGINS.includes(r.email.toLowerCase()));
      if (!seeds.length) return "no active seed logins — nothing to do";
      const others = rows.filter((r) => r.isActive && !DEV_LOGINS.includes(r.email.toLowerCase()));
      if (!others.length) {
        return "REFUSED: seed logins are the only way in — run `npm run users`, create a real login first, then re-run this check";
      }
      for (const s of seeds) {
        await db.update(schema.users).set({ isActive: false, updatedAt: new Date() }).where(eq(schema.users.id, s.id));
      }
      return `disabled: ${seeds.map((s) => s.email).join(", ")} (your logins untouched)`;
    },
  },
];

async function runCheck(check: Check, offerFix: boolean): Promise<boolean> {
  const status = await check.run();
  console.log(`  ${status.ok ? "✓" : "✖"} ${check.label.padEnd(34)} ${status.ok ? status.detail : ""}`);
  if (!status.ok && status.detail) {
    for (const line of status.detail.split("\n")) console.log(`      ${line}`);
  }
  if (!status.ok && offerFix && check.fix) {
    if (check.fixNote) console.log(`      fix: ${check.fixNote}`);
    if (await askYesNo("      apply fix?")) {
      try {
        const out = await check.fix();
        console.log(`      → ${out}`);
        const again = await check.run();
        console.log(`      re-check: ${again.ok ? "✓ healthy" : `✖ still failing: ${again.detail.split("\n")[0]}`}`);
        return again.ok;
      } catch (err) {
        console.log(`      fix failed: ${err instanceof Error ? err.message : err}`);
        return false;
      }
    }
  }
  return status.ok;
}

async function fullCheckup() {
  console.log("\n── full health check ──");
  // Connection first: without it every other check is noise.
  const conn = checks[0];
  const connOk = await runCheck(conn, false);
  if (!connOk) {
    console.log("\n  stopping here — no check below can pass without a connection.");
    console.log("  fix the connection, then re-run the checkup.");
    return;
  }
  let bad = 0;
  for (const check of checks.slice(1)) {
    if (!(await runCheck(check, true))) bad++;
  }
  console.log(bad === 0 ? "\n  all healthy ✓" : `\n  done — ${bad} issue(s) left unaddressed above.`);
}

async function main() {
  console.log(`target: ${describeDbTarget()}\n`);
  console.log("  db doctor — what do you want to do?");
  const items = [
    "full health check",
    ...checks.map((c) => `check: ${c.label}`),
    "quit",
  ];
  for (;;) {
    const action = await askChoice("  action", items);
    if (action === "quit") return;
    if (action === "full health check") {
      await fullCheckup();
      continue;
    }
    const check = checks.find((c) => action === `check: ${c.label}`);
    if (check) {
      console.log();
      await runCheck(check, true);
      console.log();
    }
  }
}

main()
  .then(() => {
    rl.close();
    process.exit(0);
  })
  .catch((err) => {
    rl.close();
    console.error("failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
