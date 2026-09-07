/**
 * Creates or updates one login.
 *
 *   npx tsx scripts/create-user.ts <email> <password> [ROLE] [--name "Full Name"]
 *
 * Deliberately a script taking arguments rather than another hardcoded pair in
 * `ensureDbSetup`: the seed already ships two known logins, and every extra one
 * baked in there is a credential that follows the code into whatever
 * environment runs it next.
 *
 * Re-running with an existing email updates that user's password and role
 * rather than failing on the unique index, so it doubles as a password reset.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/server/db/connection";
import { users } from "../src/server/db/schema";
import { hashPassword } from "../src/server/lib/password";

const ROLES = ["ADMIN", "SUPERADMIN"] as const;

async function main() {
  const args = process.argv.slice(2);
  const nameIndex = args.indexOf("--name");
  const name = nameIndex >= 0 ? args[nameIndex + 1] : undefined;
  const positional = nameIndex >= 0 ? args.slice(0, nameIndex) : args;

  const [email, password, roleArg] = positional;
  if (!email || !password) {
    console.error(
      "usage: npx tsx scripts/create-user.ts <email> <password> [ADMIN|SUPERADMIN] [--name \"Full Name\"]",
    );
    process.exit(1);
  }

  const role = (roleArg ?? "ADMIN").toUpperCase();
  if (!(ROLES as readonly string[]).includes(role)) {
    console.error(`role must be one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const normalised = email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalised))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        passwordHash: hashPassword(password),
        role,
        isActive: true,
        ...(name ? { name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    console.log(`updated  ${normalised}  (${role})`);
  } else {
    await db.insert(users).values({
      name: name ?? normalised.split("@")[0],
      email: normalised,
      passwordHash: hashPassword(password),
      role,
    });
    console.log(`created  ${normalised}  (${role})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
