# 🔧 Garage Manager — GMS

A **mobile-first Progressive Web App** for a single-owner automobile/mechanical garage. Built to replace a paper-and-pen workflow with a clean, fast, offline-capable digital system.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Core Workflow](#core-workflow)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Design System](#design-system)
- [Dashboard](#dashboard)

---

## Overview

Garage Manager is a **single-tenant** garage management system designed for one physical garage with two stock locations: a **Shop** (front floor) and a **Warehouse** (back store / house stock). The operator manages customers, service jobs, inventory, invoices, and payments from their phone or tablet.

> This is **not** a spare-parts POS. The business is service-first — parts exist to support jobs.

---

## Core Workflow

```
Customer arrives
       ↓
   Open Job  (complaint, vehicle, odometer)
       ↓
Add Labour + Parts used
       ↓
  Complete Job  (deducts Shop stock atomically)
       ↓
  Invoice raised  (subtotal, discount, total)
       ↓
Payment collected  (cash / UPI / card / bank transfer)
       ↓
  Credit tracked  (ISSUED → PARTIALLY_PAID → PAID)
```

Inventory flows separately:

```
Supplier → Stock In (Warehouse or Shop)
                ↓
       Warehouse → Shop  (Transfer)
                ↓
     Shop → Job Usage  (on job completion)
```

---

## Features

### 👥 Customers & Vehicles
- Create and search customers by name or phone
- Vehicle deduplication — same registration number reuses the same vehicle row
- Supports: Car · Bike · Scooty · Auto · Other
- Customer billing stats: total billed, collected, outstanding, job count

### 🔧 Jobs (Service Orders)
- Auto-numbered job IDs (`JOB-2026-0001`)
- Tracks: complaint, work notes, odometer reading
- Statuses: **Open → Completed / Cancelled**
- Add labour entries (description + amount) and parts (from shop stock)
- Completing a job atomically deducts shop stock and raises an invoice

### 📦 Inventory
- Parts with category, supplier, brand, part number, barcode, custom attributes
- Two locations: **SHOP** and **WAREHOUSE**
- Movement types: `STOCK_IN · JOB_USAGE · TRANSFER_IN · TRANSFER_OUT · RETURN · DAMAGE · ADJUSTMENT`
- Bulk transfers (multiple parts in one atomic transaction)
- Low-stock alerts for both shop and warehouse against configurable minimums
- Full movement history per part

### 🧾 Invoices & Payments
- Auto-numbered invoices (`INV-2026-000001`) with configurable prefix
- Line items: parts + labour
- Discount support
- Statuses: `ISSUED · PARTIALLY_PAID · PAID · CANCELLED`
- Multiple payment records per invoice (CASH / UPI / CARD / BANK_TRANSFER / OTHER)
- PDF invoice generation (PDFKit)

### 📊 Reports & Dashboard
- Period reports: **Today · This Week · This Month · This Year**
- Metrics: billed, collected, outstanding credit, jobs completed, invoices issued, parts consumed
- Live dashboard: active jobs, low shop stock, customer outstanding credit list, recent invoices
- Stock value at cost per location

### ⚙️ Settings
- Business name, phone, address
- Invoice prefix and terms

### 🔐 Auth
- Single admin account; JWT session cookie (jose)
- Role-based: `ADMIN` (garage operator), `SUPERADMIN` (platform operator only)
- Audit log for all mutations
- Session timeout tracked via `lastActivityAt`

### 📱 PWA
- Installable on Android/iOS
- Basic offline shell (service worker + manifest)
- Mobile-first layout with floating nav pill

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 |
| Database (dev) | [PGlite](https://pglite.dev/) — embedded Postgres in-process |
| Database (prod) | PostgreSQL (via [node-postgres](https://node-postgres.com/)) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Migrations | Drizzle Kit |
| Auth | [jose](https://github.com/panva/jose) — JWT, cookie-based |
| UI State | [TanStack Query v5](https://tanstack.com/query) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Icons | [Lucide React](https://lucide.dev/) |
| PDF | [PDFKit](https://pdfkit.org/) |
| Styling | Tailwind CSS v4 (custom design system — see [DESIGN.md](./DESIGN.md)) |
| Toasts | [Sonner](https://sonner.emilkowal.ski/) |
| Testing | [Vitest](https://vitest.dev/) |

---

## Project Structure

```
next-app/
├── drizzle/                  # SQL migration files
│   ├── 0000_free_dragon_lord.sql
│   └── meta/
├── scripts/
│   ├── seed-demo.ts          # Seed with realistic demo data
│   └── db-setup.ts           # Manual DB bootstrap helper
├── src/
│   ├── app/
│   │   ├── (app)/            # Authenticated garage operator routes
│   │   │   ├── dashboard/    # Main dashboard
│   │   │   ├── jobs/         # Job list + detail + create
│   │   │   ├── customers/    # Customer list + detail
│   │   │   ├── invoices/     # Invoice list + detail + PDF
│   │   │   ├── inventory/    # Parts, categories, suppliers,
│   │   │   │   │             # transfers, movements, low-stock
│   │   │   └── settings/
│   │   ├── (auth)/           # Login page
│   │   ├── api/              # Route handlers (REST-style)
│   │   └── superadmin/       # Platform control plane (separate from garage)
│   ├── components/
│   │   ├── ui.tsx            # Full design-system component library
│   │   ├── illustrations.tsx # Spot SVG illustrations
│   │   ├── app-nav.tsx       # Floating nav pill + route-aware FAB
│   │   ├── search-select.tsx # Reusable async search dropdown
│   │   └── animated-dropdown.tsx
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.ts     # Drizzle schema (single source of truth)
│   │   │   ├── connection.ts # PGlite / pg adapter switch
│   │   │   └── seed.ts       # Admin + locations + settings bootstrap
│   │   ├── services/         # Business logic layer
│   │   │   ├── customer.service.ts
│   │   │   ├── job.service.ts
│   │   │   ├── invoice.service.ts
│   │   │   ├── inventory.service.ts
│   │   │   ├── category.service.ts
│   │   │   ├── report.service.ts
│   │   │   ├── pdf.service.ts
│   │   │   └── audit.service.ts
│   │   ├── auth/             # JWT session helpers
│   │   └── lib/              # HTTP error class, shared utils
│   ├── hooks/                # React hooks
│   └── lib/                  # Client-side utils (api, format, cn)
├── DESIGN.md                 # Design system reference
├── drizzle.config.ts
├── next.config.ts
└── vitest.config.mts
```

---

## Data Model

### Core Tables

| Table | Purpose |
|---|---|
| `users` | Admin accounts (role: ADMIN / SUPERADMIN) |
| `customers` | Customer master (name, phone, address) |
| `vehicles` | Vehicles linked to customers (type, reg number) |
| `jobs` | Service orders (complaint, odometer, status) |
| `job_labour` | Labour line items on a job |
| `job_parts` | Parts used on a job (price snapshot at time of job) |
| `invoices` | Raised on job completion (subtotal / discount / total / paid / due) |
| `invoice_items` | Line items on the invoice (parts + labour) |
| `payments` | Payment records per invoice |

### Inventory Tables

| Table | Purpose |
|---|---|
| `categories` | Part categories |
| `suppliers` | Supplier master |
| `parts` | Part master (purchase price, selling price, minimums, attributes) |
| `inventory_locations` | SHOP and WAREHOUSE location records |
| `inventory_balances` | Current quantity per part per location |
| `stock_movements` | Full audit trail of every stock change |
| `stock_transfers` | Transfer header (from → to) |
| `stock_transfer_items` | Individual part quantities per transfer |

### Platform Tables

| Table | Purpose |
|---|---|
| `settings` | Business name, invoice prefix/terms |
| `audit_logs` | User action audit trail |
| `system_health_checks` | API/DB health probe records |
| `system_alerts` | Platform-level alert conditions |

### Enums

| Enum | Values |
|---|---|
| `vehicle_type` | CAR · BIKE · SCOOTY · AUTO · OTHER |
| `job_status` | OPEN · COMPLETED · CANCELLED |
| `movement_type` | STOCK_IN · JOB_USAGE · TRANSFER_IN · TRANSFER_OUT · RETURN · DAMAGE · ADJUSTMENT |
| `invoice_status` | ISSUED · PARTIALLY_PAID · PAID · CANCELLED |
| `payment_method` | CASH · UPI · CARD · BANK_TRANSFER · OTHER |
| `location_type` | WAREHOUSE · SHOP |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm or bun

### Install & Run

```bash
cd next-app
npm install
npm run dev
```

Opens at **http://localhost:3000**

Default login:
```
Email:    admin@garage.com
Password: admin123
```

In development the app runs on **PGlite** — an embedded Postgres stored locally in `.pglite/`. The schema is created and seeded automatically on first start. No external database required.

**Reset the dev database:**
```bash
rm -rf .pglite/
npm run dev  # schema + seed runs again on next start
```

### Seed Demo Data

To populate with realistic sample customers, jobs, invoices, and stock:

```bash
npm run seed:demo
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `USE_PGLITE` | `true` | Set to `false` in production to use `DATABASE_URL` |
| `DATABASE_URL` | — | Postgres connection string (production only) |
| `PGLITE_DATA_DIR` | `.pglite` | Where PGlite stores its data files |
| `JWT_SECRET` | — | Secret for signing session tokens (auto-generated in dev) |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with PGlite (auto-migrates + seeds) |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest test suite (service layer, isolated PGlite) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run seed:demo` | Populate dev DB with demo data |
| `npm run db:setup` | Manual DB bootstrap helper |
| `npx drizzle-kit generate` | Regenerate migrations after schema changes |
| `npx drizzle-kit studio` | Open Drizzle Studio (visual DB browser) |

---

## Testing

Tests run against an isolated in-memory PGlite instance — no external database needed.

```bash
npm test
```

Test files live alongside their services:

```
src/server/services/
├── inventory.service.test.ts
├── invoice.service.test.ts
└── report.service.test.ts
```

Tests cover the service layer directly (not the HTTP layer) to keep them fast and focused on business logic.

---

## Production Deployment

### Vercel + Managed Postgres (recommended)

1. Create a Postgres database — [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech/), or [Supabase](https://supabase.com/) all work.

2. In Vercel project settings, set environment variables:
   ```
   USE_PGLITE=false
   DATABASE_URL=<your-postgres-connection-string>
   JWT_SECRET=<random-secret-min-32-chars>
   ```

3. Deploy. On cold start, `src/instrumentation.ts` automatically:
   - Runs all pending Drizzle migrations
   - Seeds the admin user, inventory locations, and default settings

> No manual `drizzle-kit push` or `migrate` step needed.

### After Schema Changes

```bash
npx drizzle-kit generate   # creates a new migration file in drizzle/
```

Commit the generated `.sql` file. It will run automatically on the next deployment.

---

## Design System

The UI is built on a custom warm "workshop" design system documented in [`DESIGN.md`](./DESIGN.md). Key principles:

- **Canvas**: Warm bone `#efe9dc` — never pure white
- **Ink**: Dark forest `#22392c` — never pure black
- **Accents**: Forest (positive/primary) · Terracotta (danger/credit) · Ochre (warnings/counts) · Sage (soft positive)
- **No gradients. No glows. No `transition-all`.**
- Hierarchy from **weight and colour before size**
- Every async surface has: loading (skeleton) · empty (illustration) · error (retry) states

Component library lives in [`src/components/ui.tsx`](./src/components/ui.tsx):
`BentoGrid` · `Tile` · `StatTile` · `SpecTile` · `HeroPanel` · `Panel` · `SectionHeader` · `Badge` · `Button` · `Input` · `Select` · `Sheet` · `Skeleton` · `EmptyState` · `ErrorState`

---

## Dashboard

The dashboard (`/dashboard`) gives the operator an at-a-glance view of the workshop, split into:

1. **Hero bento grid** — today's billed amount, collected, active jobs, shop/warehouse stock levels, outstanding credit, completed today, stock spend
2. **Period report** (Today / Week / Month / Year) — billed, collected, outstanding, jobs completed, invoices issued, parts consumed
3. **Active jobs feed** — open jobs with vehicle type, customer, complaint
4. **Low shop stock** — parts below minimum shop threshold
5. **Outstanding credit** — customers carrying unpaid balances, sorted by amount
6. **Recent invoices** — last 5 invoices with payment status

All dashboard data is fetched from `/api/dashboard` and `/api/reports/:period` in parallel — no sequential round trips.


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