# Garage Manager

A mobile-first PWA for a single-owner garage workshop. Built with Next.js 16, Drizzle ORM, PGlite (dev) / PostgreSQL (production).

## Features

- Customers, vehicles, jobs, invoices, payments (credit/partial), PDF invoices
- Inventory: parts, categories, suppliers, SHOP/WAREHOUSE stock, transfers, adjustments, movements, low-stock alerts
- Stock is deducted from the shop only when a job is completed
- Reports (daily/weekly/monthly/yearly) and customer outstanding balances
- Mobile-first PWA (installable, basic offline shell)
- Single admin account; JWT session cookie

## Development

```bash
npm install
npm run dev
```

Opens at http://localhost:3000. Default login: `admin@garage.com` / `admin123`.

In development the app runs on **PGlite**, an embedded Postgres stored in `.pglite/`. Schema is created and seeded automatically on first start. The DB resets by deleting `.pglite/`.

## Tests

```bash
npm test        # vitest (service layer against an isolated PGlite)
npm run lint
```

## Environment variables

| Variable         | Default            | Description                                             |
| ---------------- | ------------------ | ------------------------------------------------------- |
| `USE_PGLITE`     | `true`             | Set to `false` in production to use `DATABASE_URL`.     |
| `DATABASE_URL`   | —                  | Postgres connection string (production only).           |
| `PGLITE_DATA_DIR`| `.pglite`          | Where PGlite stores its data (tests use a temp dir).    |

## Production deployment (Vercel + Postgres)

1. Create a managed Postgres database (e.g. Vercel Postgres, Neon, Supabase).
2. In Vercel project settings, add the environment variables:
   - `USE_PGLITE` = `false`
   - `DATABASE_URL` = your Postgres connection string
3. Deploy. On cold start, `instrumentation.ts` runs migrations and seeds the
   admin user / locations / settings automatically, so no manual schema step.

Migrations live in `drizzle/`. To regenerate them after schema changes:

```bash
npx drizzle-kit generate
```

The production path (node-postgres) is verified end-to-end against a real
Postgres instance; the dev path (PGlite) is used for local development and tests.