/**
 * Interactive user management CLI — one command, menu driven.
 *
 *   npm run users
 *
 * Shows a menu: view users / create user / update user / delete user.
 * Every question is asked step by step (name, email, password + confirm,
 * role), so there is nothing else to memorise.
 *
 * Uses the app's own scrypt `hashPassword` from `src/server/lib/password`,
 * so every account created here logs in exactly like a seeded one.
 */
import readline from "node:readline";
import { eq } from "drizzle-orm";
import { db, describeDbTarget } from "../src/server/db/connection";
import { users } from "../src/server/db/schema";
import { hashPassword } from "../src/server/lib/password";

const ROLES = ["ADMIN", "SUPERADMIN"] as const;
type Role = (typeof ROLES)[number];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(question, (ans) => resolve(ans.trim()));
      return;
    }
    // Hide password input: suppress echo while typing.
    const origWrite = (rl as any)._writeToOutput;
    (rl as any)._writeToOutput = () => {};
    rl.question(question, (ans) => {
      (rl as any)._writeToOutput = origWrite;
      process.stdout.write("\n");
      resolve(ans.trim());
    });
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

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

type Row = { id: string; name: string; email: string; role: string; isActive: boolean };

async function listUsers(): Promise<Row[]> {
  const rows = (await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)) as Row[];
  if (!rows.length) {
    console.log("  (no users yet)");
    return rows;
  }
  console.log("\n  #  email                          name                 role        active");
  rows.forEach((u, i) => {
    console.log(
      `  ${String(i + 1).padEnd(2)} ${u.email.padEnd(30)} ${(u.name ?? "").slice(0, 20).padEnd(20)} ${u.role.padEnd(11)} ${u.isActive ? "yes" : "NO"}`,
    );
  });
  console.log();
  return rows;
}

async function pickUser(rows: Row[]): Promise<Row | undefined> {
  const ans = await ask("  email or # of the user: ");
  const idx = Number(ans);
  if (Number.isInteger(idx) && idx >= 1 && idx <= rows.length) return rows[idx - 1];
  const found = rows.find((r) => r.email.toLowerCase() === ans.toLowerCase());
  if (!found) console.log("  no match — try again or Ctrl+C to quit.");
  return found;
}

async function promptPassword(): Promise<string> {
  for (;;) {
    const pw = await ask("  password (min 8 chars): ", true);
    if (pw.length < 8) {
      console.log("  too short — min 8 characters.");
      continue;
    }
    const again = await ask("  confirm password: ", true);
    if (pw !== again) {
      console.log("  passwords do not match — try again.");
      continue;
    }
    return pw;
  }
}

async function createFlow() {
  console.log("\n── create user ──");
  let name = "";
  while (!name) name = await ask("  full name: ");
  let email = "";
  while (!isEmail(email)) {
    email = (await ask("  email (login username): ")).toLowerCase();
    if (!isEmail(email)) console.log("  that is not a valid email.");
  }
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    console.log(`  ${email} already exists — use update/reset instead.`);
    return;
  }
  const password = await promptPassword();
  const role = (await askChoice("  role", [...ROLES])) as Role;
  await db.insert(users).values({ name, email, passwordHash: hashPassword(password), role });
  console.log(`\n  created  ${email}  (${role})`);
}

async function updateFlow() {
  console.log("\n── update user ──");
  const rows = await listUsers();
  if (!rows.length) return;
  const u = await pickUser(rows);
  if (!u) return;
  console.log(`\n  editing ${u.email} (${u.role}, ${u.isActive ? "active" : "disabled"})`);
  const what = await askChoice("  change", ["password", "role", "name", "enable/disable"]);
  if (what === "password") {
    const password = await promptPassword();
    await db.update(users).set({ passwordHash: hashPassword(password), updatedAt: new Date() }).where(eq(users.id, u.id));
    console.log(`  password reset for ${u.email}`);
  } else if (what === "role") {
    const role = (await askChoice("  new role", [...ROLES])) as Role;
    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, u.id));
    console.log(`  ${u.email} is now ${role}`);
  } else if (what === "name") {
    const name = await ask(`  new name (current: ${u.name}): `);
    if (!name) return console.log("  unchanged.");
    await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, u.id));
    console.log(`  name updated for ${u.email}`);
  } else {
    const enable = await askChoice("  set account", ["enable", "disable"]);
    await db
      .update(users)
      .set({ isActive: enable === "enable", updatedAt: new Date() })
      .where(eq(users.id, u.id));
    console.log(`  ${u.email} ${enable === "enable" ? "enabled" : "disabled"}`);
  }
}

async function deleteFlow() {
  console.log("\n── delete user ──");
  const rows = await listUsers();
  if (!rows.length) return;
  const u = await pickUser(rows);
  if (!u) return;
  // Never orphan the database: deleting the last active login locks everyone out.
  const active = rows.filter((r) => r.isActive);
  if (active.length <= 1 && active[0]?.id === u.id) {
    console.error("\n  refusing: that is the last active login — create a replacement first.");
    return;
  }
  const confirm = await ask(`  type DELETE to remove ${u.email}: `);
  if (confirm !== "DELETE") {
    console.log("  cancelled — nothing deleted.");
    return;
  }
  await db.delete(users).where(eq(users.id, u.id));
  console.log(`  deleted ${u.email}`);
}

async function main() {
  console.log(`target: ${describeDbTarget()}\n`);
  console.log("  user management — what do you want to do?");
  for (;;) {
    const action = await askChoice("  action", ["view users", "create user", "update user", "delete user", "quit"]);
    if (action === "quit") return;
    if (action === "view users") await listUsers();
    if (action === "create user") await createFlow();
    if (action === "update user") await updateFlow();
    if (action === "delete user") await deleteFlow();
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
