# Garage / Mechanical Workshop Management System

## 1. Project Overview

A full-stack, mobile-first management system for an automobile mechanical/garage shop.

The system is designed around the real workflow of a garage rather than a simple spare-parts POS:

**Customer → Vehicle → Service Job → Labour + Parts Used → Invoice → Payment**

It also manages two separate inventory locations in parallel:

- **Warehouse Stock** — larger reserve stock / storage inventory.
- **Shop Stock** — stock physically available inside the garage/shop for immediate use.

The system should make it easy for the owner/admin to:

- Manage customers and their vehicles.
- Create and manage service/job cards.
- Track labour and spare parts used in each job.
- Maintain warehouse and shop stock separately.
- Transfer stock between warehouse and shop.
- Detect low-stock and out-of-stock parts.
- Generate customer invoices.
- Track full and partial payments / credit.
- View daily, weekly, monthly and yearly revenue/payment reports.
- View customer and vehicle service history.

The product should feel like a **mobile application**, not a desktop website squeezed onto a phone.

---

# 2. Product Goals

## Primary Goals

1. Reduce manual bookkeeping.
2. Make customer/job creation extremely fast.
3. Keep warehouse and shop inventory accurate.
4. Make invoice generation fast and reliable.
5. Track outstanding customer credit.
6. Give the owner a clear view of business activity.
7. Preserve service and vehicle history.
8. Keep the implementation simple enough to maintain and extend.

## UX Goal

The most common workflow should be:

**Open app → Find/create customer → Select vehicle → Create job → Add labour/parts → Complete job → Generate invoice → Record payment.**

A normal invoice should be creatable in roughly 15–20 seconds once the customer and vehicle already exist.

---

# 3. Target Users

## Admin / Owner

Full access to:

- Dashboard
- Customers
- Vehicles
- Jobs
- Inventory
- Warehouse stock
- Shop stock
- Stock transfers
- Suppliers
- Invoices
- Payments
- Reports
- Settings

## Optional Future Role: Staff / Receptionist

Limited access can be added later:

- Customer creation
- Job creation
- Invoice creation
- Payment recording
- Inventory viewing

The first version can ship with a single **Admin** role if the client does not require multiple users.

---

# 4. Core Modules

```text
Authentication
Dashboard
Customers
Vehicles
Service Jobs / Job Cards
Inventory
  ├── Parts
  ├── Categories
  ├── Warehouse Stock
  ├── Shop Stock
  ├── Stock Transfers
  ├── Stock Movements
  └── Suppliers
Invoices
Payments / Credit
Reports
Settings
```

---

# 5. Main Business Workflow

```text
Customer
   |
   +-- Vehicle
          |
          +-- Service Job
                  |
                  +-- Labour
                  |
                  +-- Parts Used
                  |      |
                  |      +-- Shop Stock
                  |      +-- Warehouse Stock (via transfer if required)
                  |
                  +-- Invoice
                         |
                         +-- Payment(s)
```

Inventory is independent but connected to jobs:

```text
Warehouse Stock <---- Stock Transfer ----> Shop Stock
                                           |
                                           v
                                      Parts Used
                                           |
                                           v
                                       Service Job
```

---

# 6. Dashboard

The dashboard should be optimized for quick daily operations.

## Summary Cards

- Today's revenue
- Today's collected amount
- Today's credit / due amount
- Active jobs
- Completed jobs today
- Low-stock parts
- Out-of-stock parts
- Total outstanding customer credit

## Active Jobs Section

Show cards such as:

```text
JOB-1024
Maruti Swift · AS01AB1234
Brake Service
IN PROGRESS
```

```text
JOB-1025
Hyundai i20 · AS01CD4567
Oil Change
READY
```

## Low Stock Section

Show urgent parts first:

```text
Brake Pad     Shop: 2   Warehouse: 10
Oil Filter    Shop: 1   Warehouse: 4
Air Filter    Shop: 0   Warehouse: 8
```

Important distinction:

- **Low shop stock** does not necessarily mean the part must be purchased.
- The system should show available warehouse quantity so the admin can transfer stock first.

## Primary Actions

- `+ New Job`
- `+ New Customer`
- `+ Add Stock`
- `Transfer Stock`

`+ New Job` should be the most prominent action.

---

# 7. Customer Management

## Customer Fields

```text
id
name
phone
email (optional)
address (optional)
notes (optional)
created_at
updated_at
```

## Features

- Add customer
- Edit customer
- Search customer
- View customer profile
- View customer vehicles
- View customer jobs
- View invoice history
- View total paid amount
- View outstanding credit
- Record payment

## Customer Profile

Example:

```text
Rahul Das
987XXXXXXX

Total Jobs: 18
Total Billed: ₹82,400
Paid: ₹70,000
Outstanding: ₹12,400

Vehicles
----------------
AS01AB1234 · Maruti Swift
AS01CD4567 · Hyundai i20

Recent Jobs
----------------
JOB-1024 · Brake Service · ₹2,450
JOB-1012 · General Service · ₹6,200
```

---

# 8. Vehicle Management

A customer can own multiple vehicles.

## Vehicle Fields

```text
id
customer_id
registration_number
make
model
variant (optional)
year (optional)
fuel_type (optional)
vin (optional)
current_odometer (optional)
notes (optional)
created_at
updated_at
```

## Features

- Add vehicle
- Edit vehicle
- Search by registration number
- View vehicle history
- View previous jobs
- View previous invoices
- View parts used in previous services
- Track odometer reading

## Vehicle History Example

```text
Maruti Swift
AS01AB1234

18 Aug 2026
Brake Service
₹2,450
72,450 km

12 May 2026
Engine Oil Change
₹1,850
68,900 km

04 Jan 2026
General Service
₹6,200
64,200 km
```

---

# 9. Service Job / Job Card

This is the central operational entity of the garage.

## Job Statuses

```text
RECEIVED
INSPECTION
IN_PROGRESS
READY
COMPLETED
CANCELLED
```

## Job Fields

```text
id
job_number
customer_id
vehicle_id
complaint
inspection_notes
work_notes
odometer_reading
status
estimated_total (optional)
actual_total (optional)
started_at
completed_at
created_at
updated_at
```

## Job Workflow

```text
New Job
   ↓
Select Customer
   ↓
Select / Create Vehicle
   ↓
Enter Complaint
   ↓
Create Job
   ↓
Inspection
   ↓
Add Labour
   ↓
Add Parts
   ↓
Complete Job
   ↓
Generate Invoice
   ↓
Record Payment
```

## Job Details

The job should contain:

### Customer / Vehicle

- Customer
- Vehicle
- Registration number

### Complaint

Example:

> Customer reports brake noise while braking.

### Inspection

Example:

> Front brake pads worn and require replacement.

### Labour

Example:

```text
Brake inspection       ₹150
Brake pad replacement  ₹350
Brake cleaning         ₹100
```

### Parts Used

Example:

```text
Brake Pad      1 × ₹1,800
Brake Cleaner  1 × ₹250
```

### Total

```text
Parts:  ₹2,050
Labour:   ₹600
----------------
Total:  ₹2,650
```

---

# 10. Inventory Management

Inventory is location-aware.

There are two physically separate stock locations:

```text
WAREHOUSE
SHOP
```

A part can have stock in both locations.

Example:

```text
Brake Pad

Warehouse: 25
Shop:       4
Total:     29
```

The system should never treat this as a single undifferentiated stock number.

---

# 11. Parts

## Part Fields

```text
id
category_id
name
part_number
brand
vehicle_compatibility (optional)
purchase_price
selling_price
minimum_shop_stock
minimum_warehouse_stock
supplier_id (optional)
unit
barcode (optional)
description (optional)
created_at
updated_at
```

## Part Features

- Add part
- Edit part
- Archive part instead of hard deleting where history exists
- Search by name
- Search by part number
- Search by brand
- Search by barcode (future / optional)
- View shop stock
- View warehouse stock
- View total stock
- View stock movement history
- View usage history

---

# 12. Categories

Example categories:

```text
Engine Parts
Brake System
Clutch
Suspension
Electrical
Filters
Cooling System
AC System
Steering
Body Parts
Tyres
Lubricants
Accessories
Other
```

Features:

- Add category
- Edit category
- Archive category
- View parts in category

---

# 13. Warehouse Stock

Warehouse stock represents reserve/storage inventory.

## Operations

- Add incoming stock
- Adjust stock
- View stock
- View stock history
- Search/filter stock
- Low-stock detection

Example:

```text
Brake Pad
Warehouse: 25
Minimum:   10
Status:    HEALTHY
```

---

# 14. Shop Stock

Shop stock represents the inventory physically available at the garage/shop.

This is the stock normally consumed by mechanics during jobs.

Example:

```text
Brake Pad
Shop: 4
Minimum: 5
Status: LOW STOCK
```

The dashboard should immediately highlight this.

---

# 15. Stock Transfer

This is a critical feature because inventory exists in two locations.

## Transfer Flow

```text
Warehouse
   ↓
Select Part
   ↓
Quantity
   ↓
Shop
   ↓
Confirm Transfer
```

Example:

```text
Brake Pad
Warehouse: 25
Shop: 4

Transfer: 5

After transfer:
Warehouse: 20
Shop: 9
```

This operation must be performed atomically in the database.

## Future Direction

The stock model can later support more locations by introducing a generic `inventory_locations` table, but V1 can be explicitly built around `WAREHOUSE` and `SHOP` for simplicity.

---

# 16. Stock Movement / Audit Trail

Never rely only on `current_stock`.

Every stock-changing event should create a movement record.

## Movement Types

```text
PURCHASE
JOB_USAGE
TRANSFER_IN
TRANSFER_OUT
RETURN
DAMAGE
ADJUSTMENT
```

Example:

```text
18 Aug 2026 09:30
+20
PURCHASE
Supplier: ABC Auto Parts

18 Aug 2026 11:15
-5
TRANSFER_OUT
Warehouse → Shop

18 Aug 2026 14:10
-1
JOB_USAGE
JOB-1024
```

This gives the owner a complete history of why stock changed.

---

# 17. Stock Rules

## Job Part Consumption

When parts are actually used in a completed/finalized job:

```text
Shop stock -= quantity used
```

If shop stock is insufficient:

```text
Shop stock < quantity required
```

the system should:

1. Block the operation OR require explicit override.
2. Show warehouse availability.
3. Suggest a stock transfer.

Recommended V1 behavior:

**Block negative stock by default.**

Example:

```text
Required: 3
Shop: 1
Warehouse: 15

Insufficient shop stock.
Transfer 2 from warehouse first.
```

Manual override can be added later if the business needs it.

---

# 18. Suppliers

Supplier management can remain lightweight.

## Fields

```text
id
name
phone
email (optional)
address (optional)
notes (optional)
created_at
updated_at
```

## Features

- Add supplier
- Edit supplier
- View supplied parts
- View stock purchases
- Search supplier

A complex procurement module is not needed for V1.

---

# 19. Invoice Management

Invoices should be generated from completed service jobs.

## Invoice Structure

```text
Invoice
├── Customer
├── Vehicle
├── Job
├── Labour items
├── Part items
├── Subtotal
├── Discount
├── Tax (optional, depending on client requirement)
├── Total
├── Paid amount
├── Due amount
└── Payment status
```

## Invoice Status

```text
DRAFT
ISSUED
PARTIALLY_PAID
PAID
CANCELLED
```

## Invoice Number

Use a human-readable sequential number, for example:

```text
INV-2026-000001
INV-2026-000002
```

Do not derive invoice numbers from database IDs alone if the business expects readable invoice numbering.

## Invoice Actions

- View invoice
- Generate PDF
- Print
- Share PDF
- Record payment
- View payment history
- Cancel invoice (with auditability)

---

# 20. Payments and Credit

Payment should be a separate entity because one invoice can have multiple payments.

## Payment Methods

```text
CASH
UPI
CARD
BANK_TRANSFER
OTHER
```

## Payment Example

```text
Invoice Total: ₹10,000

Payment 1: ₹3,000
Payment 2: ₹2,000
Payment 3: ₹5,000

Outstanding: ₹0
```

## Credit States

```text
PAID
PARTIAL
CREDIT
```

## Customer Credit Dashboard

```text
Total Outstanding
₹1,24,500

This Month
₹34,200

Overdue / Pending
₹18,500
```

The system should also allow:

- View customer outstanding balance.
- View all unpaid invoices.
- Record partial payment.
- Record full payment.
- View payment history.

---

# 21. Reports

Reports should focus on practical business metrics.

## Daily

- Jobs created
- Jobs completed
- Total invoices
- Total billed
- Total collected
- Total credit
- Parts consumed

## Weekly

Same metrics grouped by week/day.

## Monthly

- Revenue
- Collected amount
- Credit generated
- Credit collected
- Completed jobs
- Average invoice value
- Most-used parts

## Yearly

- Monthly revenue
- Monthly collections
- Monthly credit
- Jobs completed
- Inventory usage trends

## Important Definition

Use clear financial terms:

**Billed** = invoice amount generated.

**Collected** = money actually received.

**Outstanding** = billed minus confirmed payments.

Do not call all billed amounts "revenue collected" because that hides credit.

---

# 22. Search and Filtering

Search is more important than complex analytics.

## Global / Contextual Search

Search customers by:

- Name
- Phone

Search vehicles by:

- Registration number
- Customer name
- Model

Search parts by:

- Part name
- Part number
- Brand
- Barcode (future)

Search jobs by:

- Job number
- Customer
- Vehicle registration
- Status

Search invoices by:

- Invoice number
- Customer
- Vehicle

All major lists should support:

- Search
- Filter
- Sort
- Pagination or infinite scrolling where appropriate

---

# 23. Mobile-First UX

The product should feel like an installed app.

## Bottom Navigation

Recommended:

```text
Home
Jobs
Inventory
Customers
More
```

Billing should be accessible from a job and can also appear under More if needed.

## Primary Floating Action

```text
+ New Job
```

Secondary quick actions can include:

- New Customer
- Add Stock
- Transfer Stock

## Mobile Principles

- Large tap targets.
- Minimum unnecessary typing.
- Bottom-sheet forms for small actions.
- Sticky action buttons.
- Search-first interfaces.
- Avoid wide tables on mobile.
- Use cards on mobile and tables on desktop.
- Use status chips consistently.
- Preserve context when navigating back.
- Keep key actions within thumb reach.

## Desktop

The same application should become a denser dashboard on larger screens.

```text
Desktop:
Sidebar + Content

Mobile:
Bottom Navigation + Full-screen pages
```

---

# 24. Suggested Screens

## Authentication

```text
Login
Forgot Password (optional)
```

## Dashboard

```text
Dashboard
```

## Jobs

```text
Job List
Create Job
Job Details
Edit Job
Complete Job
```

## Customers

```text
Customer List
Create Customer
Customer Details
```

## Vehicles

```text
Vehicle Details
Service History
```

## Inventory

```text
Inventory Overview
Parts
Categories
Warehouse
Shop
Stock Transfer
Stock Movement History
Suppliers
```

## Billing

```text
Invoice List
Invoice Details
Payment History
Outstanding Credit
```

## Reports

```text
Daily
Weekly
Monthly
Yearly
```

## Settings

```text
Business Profile
Invoice Settings
User Profile
```

---

# 25. Recommended Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Recharts

## Backend

- Node.js
- TypeScript
- Fastify
- Zod for request/response validation
- JWT or secure cookie-based session authentication

## Database

- PostgreSQL
- Drizzle ORM

## Infrastructure

- Docker for local development
- Managed PostgreSQL in production
- Vercel / Cloudflare for frontend
- Railway / Render / VPS for backend

## PWA

Make the frontend installable as a Progressive Web App.

Native mobile apps are not required for V1.

---

# 26. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │      Mobile / Web    │
                         │ React + TypeScript   │
                         │       PWA            │
                         └──────────┬───────────┘
                                    │
                                  HTTPS
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Fastify API        │
                         │   Node + TypeScript  │
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴───────────┐
                         │                      │
                         ▼                      ▼
                 ┌──────────────┐      ┌──────────────┐
                 │ PostgreSQL   │      │ PDF / Files  │
                 │ + Drizzle    │      │ generation   │
                 └──────────────┘      └──────────────┘
```

Keep the backend as a modular monolith.

Do **not** introduce microservices for V1.

---

# 27. Backend Module Structure

```text
server/
└── src/
    ├── modules/
    │   ├── auth/
    │   ├── users/
    │   ├── customers/
    │   ├── vehicles/
    │   ├── jobs/
    │   ├── categories/
    │   ├── parts/
    │   ├── suppliers/
    │   ├── inventory/
    │   ├── invoices/
    │   ├── payments/
    │   ├── reports/
    │   └── settings/
    │
    ├── db/
    │   ├── schema/
    │   └── migrations/
    │
    ├── plugins/
    ├── middleware/
    ├── utils/
    ├── config/
    └── server.ts
```

---

# 28. Frontend Structure

```text
web/
└── src/
    ├── pages/
    │   ├── dashboard/
    │   ├── jobs/
    │   ├── customers/
    │   ├── vehicles/
    │   ├── inventory/
    │   ├── invoices/
    │   └── reports/
    │
    ├── components/
    │   ├── ui/
    │   ├── layout/
    │   ├── forms/
    │   └── shared/
    │
    ├── features/
    │   ├── jobs/
    │   ├── customers/
    │   ├── inventory/
    │   ├── invoices/
    │   └── payments/
    │
    ├── hooks/
    ├── lib/
    ├── stores/
    ├── routes/
    └── main.tsx
```

---

# 29. Database Model

Recommended core tables:

```text
users
garages

customers
vehicles

service_jobs
job_parts
job_labour

categories
parts
suppliers
inventory_locations
inventory_balances
stock_movements
stock_transfers
stock_transfer_items

invoices
invoice_items
payments

settings
```

---

# 30. Recommended Inventory Data Model

For future scalability, model stock locations explicitly.

## inventory_locations

```text
id
name
code
location_type
created_at
updated_at
```

Examples:

```text
1 | Main Warehouse | WAREHOUSE | WAREHOUSE
2 | Main Shop      | SHOP      | SHOP
```

## inventory_balances

```text
id
part_id
location_id
quantity
updated_at
```

This makes stock querying simple:

```text
Part: Brake Pad

Warehouse → 25
Shop      → 4
```

## stock_movements

```text
id
part_id
location_id
movement_type
quantity
reference_type
reference_id
notes
created_at
```

For transfers, create paired movement records:

```text
Warehouse: TRANSFER_OUT -5
Shop:      TRANSFER_IN  +5
```

The transfer and movements should be committed in one database transaction.

---

# 31. Core Database Relationships

```text
customers
   1 ─────── N vehicles

vehicles
   1 ─────── N service_jobs

service_jobs
   1 ─────── N job_parts
   1 ─────── N job_labour
   1 ─────── 1 invoice

parts
   1 ─────── N job_parts
   1 ─────── N stock_movements

inventory_locations
   1 ─────── N inventory_balances

parts
   1 ─────── N inventory_balances

invoices
   1 ─────── N payments

customers
   1 ─────── N invoices
```

---

# 32. API Design

Use REST for V1.

## Auth

```text
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

## Customers

```text
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PATCH  /api/customers/:id
```

## Vehicles

```text
GET    /api/vehicles
POST   /api/vehicles
GET    /api/vehicles/:id
PATCH  /api/vehicles/:id
```

## Jobs

```text
GET    /api/jobs
POST   /api/jobs
GET    /api/jobs/:id
PATCH  /api/jobs/:id
POST   /api/jobs/:id/parts
POST   /api/jobs/:id/labour
POST   /api/jobs/:id/complete
```

## Parts

```text
GET    /api/parts
POST   /api/parts
GET    /api/parts/:id
PATCH  /api/parts/:id
```

## Inventory

```text
GET    /api/inventory
GET    /api/inventory/low-stock
GET    /api/inventory/movements
POST   /api/inventory/stock-in
POST   /api/inventory/adjust
POST   /api/inventory/transfers
```

## Invoices

```text
GET    /api/invoices
GET    /api/invoices/:id
POST   /api/invoices/:id/payments
GET    /api/invoices/:id/pdf
```

## Reports

```text
GET /api/reports/daily
GET /api/reports/weekly
GET /api/reports/monthly
GET /api/reports/yearly
```

---

# 33. Transaction-Sensitive Operations

The following operations should use database transactions.

## Complete Job

Conceptually:

```text
BEGIN

1. Validate job status.
2. Validate parts and quantities.
3. Validate shop stock.
4. Deduct shop stock.
5. Create JOB_USAGE stock movements.
6. Finalize job.
7. Calculate/finalize invoice.
8. Update invoice totals.

COMMIT
```

If anything fails:

```text
ROLLBACK
```

No partial inventory deduction should remain.

## Stock Transfer

```text
BEGIN

1. Validate source quantity.
2. Deduct warehouse.
3. Add shop stock.
4. Create TRANSFER_OUT movement.
5. Create TRANSFER_IN movement.
6. Create transfer record.

COMMIT
```

---

# 34. Important Business Rules

1. Stock cannot become negative by default.
2. Stock movements must be auditable.
3. Job parts should deduct from shop stock, not warehouse stock directly.
4. Warehouse-to-shop transfers are explicit operations.
5. An invoice should not be considered paid simply because it was generated.
6. Payment records determine collected amount.
7. A customer can have multiple vehicles.
8. A vehicle can have multiple jobs.
9. A job can contain multiple labour items and parts.
10. An invoice can have multiple payments.
11. Historical invoices should not change when a part's current selling price changes.
12. Historical stock movements should not be rewritten casually.
13. Prefer archive/soft-delete behavior for parts/categories with historical usage.

---

# 35. Pricing Rule

When a part is added to a job, copy the current selling price into the `job_parts` record.

Example:

```text
Current Brake Pad price = ₹1,800
```

Job created:

```text
job_parts.unit_price = ₹1,800
```

Later the part price becomes ₹2,000.

The old job must still show:

```text
Brake Pad × 1 = ₹1,800
```

Do not dynamically read historical invoice prices from the current parts table.

---

# 36. Security

Minimum V1 requirements:

- Secure authentication.
- Password hashing with a strong password hashing algorithm.
- HttpOnly secure cookies or correctly implemented token storage.
- Authorization checks on protected endpoints.
- Request validation with Zod.
- Rate limiting for authentication endpoints.
- SQL injection protection through ORM/parameterized queries.
- Server-side validation even when frontend validation exists.
- Audit timestamps on important records.

Do not trust the frontend for stock quantities, payment amounts, invoice totals or permissions.

The backend is the source of truth.

---

# 37. PDF Invoice Requirements

The invoice should include:

```text
Business Name
Business Address
Phone
Invoice Number
Invoice Date
Customer Name
Customer Phone
Vehicle Registration
Vehicle Make/Model
Job Number
Parts
Labour
Subtotal
Discount
Tax if required
Total
Paid
Due
Payment Status
Notes / Terms
```

Actions:

```text
View PDF
Download
Print
Share
```

Invoice generation must happen from trusted server-side data.

---

# 38. Offline / Network Strategy

V1 can be online-first.

Do not attempt full offline database synchronization initially. It adds substantial complexity.

However, the PWA should:

- Cache the application shell.
- Show clear offline/online status.
- Preserve form input when possible.
- Avoid silently losing a partially completed job.

Full offline job creation and sync can become a future phase if required by the client's environment.

---

# 39. Optional Future Features

These are useful, but should not block V1.

## Phase 2 / Future

- Barcode / QR scanning.
- WhatsApp invoice sharing.
- Customer SMS/WhatsApp notifications.
- Service reminders.
- Vehicle next-service reminders.
- Parts reorder suggestions.
- Supplier purchase history.
- Multiple mechanics/staff.
- Role-based permissions.
- Multiple branches.
- Multiple warehouses.
- Generic multi-location inventory.
- GST/tax-specific invoicing if required.
- Expense tracking.
- Profit reports.
- Customer portal.
- Mechanic-specific job assignments.
- Printable job cards.
- Photo attachments for vehicle/job damage.
- Tyre/battery lifecycle tracking.
- Odometer service reminders.

---

# 40. Features Explicitly Out of Scope for V1

Avoid overbuilding.

Do not initially add:

- Microservices
- Kafka
- Kubernetes
- Elasticsearch
- AI forecasting
- Payroll
- Full accounting software
- Complex purchase-order management
- Multi-company ERP architecture
- Advanced workflow automation
- Full offline synchronization

These add complexity without solving the client's immediate requirements.

---

# 41. Development Phases

## Phase 1 — Project Foundation

- Repository setup
- React + TypeScript frontend
- Fastify + TypeScript backend
- PostgreSQL
- Drizzle ORM
- Docker local environment
- Authentication
- Base layout
- Mobile navigation
- Error handling
- API validation

## Phase 2 — Customer & Vehicle

- Customers CRUD
- Vehicles CRUD
- Customer profile
- Vehicle profile
- Search
- Service history skeleton

## Phase 3 — Inventory

- Categories
- Parts CRUD
- Suppliers
- Warehouse location
- Shop location
- Inventory balances
- Stock in
- Stock adjustment
- Stock movements
- Low-stock detection

## Phase 4 — Stock Transfer

- Warehouse → Shop transfer
- Transfer history
- Atomic transfer transaction
- Shop stock alerts

## Phase 5 — Job Management

- Job creation
- Customer/vehicle linking
- Job status
- Complaint
- Inspection notes
- Work notes
- Labour items
- Parts used
- Odometer

## Phase 6 — Billing

- Invoice generation
- Invoice numbering
- Invoice PDF
- Print
- Payment recording
- Partial payment
- Credit tracking

## Phase 7 — Reports

- Daily report
- Weekly report
- Monthly report
- Yearly report
- Customer credit report
- Inventory usage report

## Phase 8 — UX / Production Polish

- PWA installation
- Loading states
- Empty states
- Error states
- Skeleton loaders
- Mobile optimization
- Accessibility improvements
- Performance optimization
- Audit logs where necessary
- Production deployment

---

# 42. Suggested Milestones

## Milestone 1

User can:

```text
Login
→ Create customer
→ Create vehicle
→ Create job
```

## Milestone 2

User can:

```text
Create parts
→ Add warehouse stock
→ Transfer stock to shop
→ View inventory
```

## Milestone 3

User can:

```text
Open job
→ Add labour
→ Add parts
→ Complete job
→ Deduct shop stock
```

## Milestone 4

User can:

```text
Generate invoice
→ Record payment
→ Track due
→ View customer history
```

## Milestone 5

User can:

```text
View daily / weekly / monthly / yearly reports
```

## Milestone 6

Production quality:

```text
PWA
Mobile UX
PDF
Print
Error handling
Performance
Deployment
```

---

# 43. Testing Strategy

## Unit Tests

Test business logic such as:

- Invoice total calculation.
- Payment balance calculation.
- Low-stock detection.
- Stock transfer calculation.
- Stock deduction.
- Credit balance calculation.

## Integration Tests

Test critical database workflows:

- Create job.
- Add parts.
- Complete job.
- Deduct stock.
- Generate invoice.
- Record payment.
- Perform transfer.

## Important Test Cases

### Inventory

- Transfer more than warehouse stock.
- Use more parts than shop stock.
- Transfer zero quantity.
- Negative quantities.
- Concurrent stock updates.

### Payments

- Payment greater than due.
- Partial payment.
- Multiple payments.
- Zero payment.

### Jobs

- Complete already completed job.
- Cancelled job cannot be completed.
- Invoice generated twice.
- Part price changed after job creation.

---

# 44. Performance Priorities

The app is operational software, so perceived speed matters.

Prioritize:

- Fast initial load.
- Fast search.
- Server-side pagination for large lists.
- Indexed database columns.
- Efficient report queries.
- Avoid unnecessary frontend refetching.
- Optimistic UI only where safe.

Recommended database indexes:

```text
customers.phone
vehicles.registration_number
parts.part_number
parts.name
service_jobs.job_number
service_jobs.status
invoices.invoice_number
invoices.created_at
stock_movements.part_id
stock_movements.created_at
payments.customer_id
payments.created_at
```

---

# 45. Suggested UI Design Language

The UI should look modern and operational rather than overly decorative.

## Design principles

- Clean typography.
- Strong spacing hierarchy.
- Clear status chips.
- Large touch targets.
- Minimal borders.
- Cards for mobile.
- Tables for desktop.
- Sticky bottom actions for long forms.
- Bottom sheets for quick selections.
- Search bars at the top of high-volume lists.

## Status Colors

Use a consistent semantic system:

```text
GREEN  → Paid / Completed / Healthy
YELLOW → Pending / Low Stock / In Progress
RED    → Overdue / Out of Stock / Error
BLUE   → Informational / Received / Inspection
```

Do not rely only on colors; also show text labels for accessibility.

---

# 46. Example Mobile Navigation

```text
┌──────────────────────────┐
│ Garage Manager      🔔   │
├──────────────────────────┤
│ Today's Revenue          │
│ ₹18,450                  │
│                          │
│ Active Jobs       7      │
│ Outstanding       ₹32.5k │
│                          │
│ Low Shop Stock           │
│ Brake Pad       2        │
│ Oil Filter      1        │
│                          │
│ Active Jobs              │
│ ──────────────────────── │
│ Swift · AS01AB1234      │
│ Brake Service            │
│ IN PROGRESS              │
│                          │
│        + New Job         │
├──────────────────────────┤
│ Home Jobs Inv. Cust More │
└──────────────────────────┘
```

The exact visual design can change, but the interaction hierarchy should remain.

---

# 47. Recommended V1 Feature List

## Must Have

- [x] Admin authentication
- [x] Dashboard
- [x] Customer management
- [x] Vehicle management
- [x] Job cards
- [x] Labour entries
- [x] Parts used in jobs
- [x] Categories
- [x] Parts management
- [x] Warehouse stock
- [x] Shop stock
- [x] Warehouse → shop stock transfer
- [x] Stock movements
- [x] Low-stock alerts
- [x] Supplier management
- [x] Invoice generation
- [x] PDF invoice
- [x] Payments
- [x] Partial payments
- [x] Customer credit tracking
- [x] Daily reports
- [x] Weekly reports
- [x] Monthly reports
- [x] Yearly reports
- [x] Customer history
- [x] Vehicle service history
- [x] Mobile-first responsive UI
- [x] PWA

## Nice to Have Later

- [ ] Barcode scanner
- [ ] WhatsApp sharing
- [ ] Service reminders
- [ ] Customer notifications
- [ ] Multiple staff
- [ ] Role-based permissions
- [ ] Multiple branches
- [ ] Multiple warehouses
- [ ] Expense tracking
- [ ] Profit reporting
- [ ] Photo attachments
- [ ] Purchase order workflow

---

# 48. Final Product Definition

This project should be positioned as:

> **A mobile-first garage management system for managing customers, vehicles, service jobs, labour, spare parts, dual-location inventory, invoices, payments, credit, and business reports.**

It is **not** a spare-parts POS.

The main business entity is the **Service Job**.

The main operational entities are:

```text
Customer
Vehicle
Service Job
Part
Inventory Location
Invoice
Payment
```

The inventory architecture is:

```text
Warehouse Stock
      ↓
Stock Transfer
      ↓
Shop Stock
      ↓
Parts Used in Job
      ↓
Service Job
      ↓
Invoice
      ↓
Payment
```

The strongest architectural decision is to keep this as a **modular monolith** with PostgreSQL transactions handling inventory, jobs, invoices, and payments. It will be simpler to develop, easier to deploy, and still demonstrate serious full-stack engineering.

---

# 49. Recommended Build Order

The recommended implementation sequence is:

```text
1. Project setup + authentication
2. Database schema + migrations
3. Customers
4. Vehicles
5. Parts + categories
6. Warehouse + shop inventory
7. Stock transfer
8. Job cards
9. Labour + parts usage
10. Invoice generation
11. Payments + credit
12. Dashboard
13. Reports
14. PDF / print
15. PWA + mobile polish
16. Testing + production deployment
```

Do not start by building the dashboard. Build the underlying domain model first, then the dashboard becomes a projection of real data rather than a collection of fake counters.
