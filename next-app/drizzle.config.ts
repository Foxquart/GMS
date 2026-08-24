import { defineConfig } from "drizzle-kit";

const usePglite =
  (process.env.USE_PGLITE ?? "true") === "true" ||
  !process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  ...(usePglite
    ? { driver: "pglite" as const }
    : {}),
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: usePglite ? ".pglite" : process.env.DATABASE_URL!,
  },
});
