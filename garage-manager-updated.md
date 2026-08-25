**# Garage Manager — Full-Stack Garage Management System**

**## 1. Product Definition**

**\*\*Garage Manager\*\*** is a mobile-first management application for a single-owner automobile/mechanical garage.

The product replaces the client's current paper-and-pen workflow with a simple digital workflow for:

\- Customers

\- Vehicles (minimal information only)

\- Service/jobs

\- Labour

\- Spare parts used during jobs

\- Shop stock

\- Warehouse stock

\- Warehouse → Shop transfers

\- Invoices

\- Payments and customer credit

\- Daily/weekly/monthly/yearly reports

This is **\*\*not a spare-parts POS\*\***. The main business workflow is:

\`\`\`text

Customer

   ↓

Job / Service

   ↓

Labour + Parts Used

   ↓

Complete Job

   ↓

Invoice

   ↓

Payment / Credit

\`\`\`

Inventory is a supporting system:

\`\`\`text

Warehouse Stock

      ↓

Stock Transfer

      ↓

Shop Stock

      ↓

Parts Used in Job

\`\`\`

\---

**# 2. Actual Client Constraints**

The system is intentionally designed around the client's real situation:

\- One or more **garage admin** accounts may use the system; the developer/operator **superadmin is separate from the garage workflow**.

\- The garage admin manages the business; the developer superadmin only monitors, diagnoses, and controls platform access.

\- One physical warehouse / house stock location.

\- In the client's terminology, **House Stock** refers to the warehouse/reserve stock.

\- One physical shop/garage.

\- Warehouse and shop are owned by the same client.

\- Stock is deducted only when a job is completed.

\- Parts used on jobs are consumed from **\*\*Shop Stock\*\***.

\- If Shop Stock is insufficient, stock should be moved from Warehouse to Shop.

\- The owner currently uses paper and pen.

\- No GST/tax workflow is required for V1.

\- Invoice output is a PDF.

\- Vehicle information only needs to identify broad vehicle type such as Car, Bike, Scooty, etc.; detailed vehicle master data is not required for V1.

\- The application should be extremely simple and should not feel like an ERP.

\- The system should work well on mobile and feel like an installed app.

\- Full offline synchronization is optional and should not block V1.

\---

**# 3. Product Philosophy**

The application should behave like a **\*\*digital notebook for a garage owner\*\***, not enterprise ERP software.

The owner should think in terms of:

\`\`\`text

Home

Jobs

Inventory

Customers

Invoices

Reports

\`\`\`

The owner should **\*\*not\*\*** need to understand:

\`\`\`text

stock\_movements

inventory\_balances

locations

invoice\_items

transactions

repositories

\`\`\`

Those are engineering concepts.

**## Core UX rule**

\> **\*\*One screen should answer one question and present one clear primary action.\*\***

Avoid unnecessary fields, filters, workflows, and confirmations.

\---

**# 4. Primary Application Navigation**

Do not expose every inventory sub-feature in the main navigation.

Recommended navigation:

\`\`\`text

Dashboard

Jobs

Inventory

More

Inside More:

Customers

Invoices

Reports

Settings

\`\`\`

Mobile bottom navigation:

\`\`\`text

Dashboard | Jobs | Inventory | More

\`\`\`

The primary floating/primary action should be:

\`\`\`text

\+ New Job

\`\`\`

\---

**# 5. Core Modules**

\`\`\`text

Authentication

Dashboard

Customers

Jobs

Inventory

  ├── Parts

  ├── Categories

  ├── Shop Stock

  ├── Warehouse Stock

  ├── Transfers

  └── Movements

Invoices

Payments / Credit

Reports

Settings

\`\`\`

Suppliers may exist as a lightweight supporting module but should not dominate the UI.

\---

**# 6. Main User Flow**

**## Typical customer visit**

\`\`\`text

Customer arrives

      ↓

Find / Create Customer

      ↓

Select vehicle type

      ↓

Create Job

      ↓

Enter complaint / work

      ↓

Add labour

      ↓

Add parts used

      ↓

Complete Job

      ↓

System validates shop stock

      ↓

Deduct shop stock

      ↓

Create/finalize invoice

      ↓

Record payment or credit

      ↓

Generate PDF

\`\`\`

**## Stock shortage flow**

\`\`\`text

Job requires part

      ↓

Shop stock insufficient

      ↓

System shows warehouse availability

      ↓

[Move X to Shop]

      ↓

Warehouse decreases

Shop increases

      ↓

Return to job

\`\`\`

The owner should not have to leave the job and manually calculate the transfer.

\---

**# 7. Dashboard**

The dashboard should answer five questions immediately:

1\. How much did I make today?

2\. How much money is still due?

3\. How many jobs are active?

4\. Which parts are low in Shop Stock?

5\. Which jobs need attention?

Example:

\`\`\`text

Good Morning

Today's Revenue

₹18,450

Collected

₹14,200

Outstanding

₹4,250

Active Jobs

7

Low Shop Stock

5

\`\`\`

**## Dashboard sections**

**### Summary**

\- Today's billed amount

\- Today's collected amount

\- Today's outstanding amount

\- Active jobs

\- Completed jobs today

\- Low-stock parts

**### Active Jobs**

\`\`\`text

Rahul

Car

Brake Service

IN PROGRESS

\`\`\`

**### Low Stock**

\`\`\`text

Brake Pad

Shop: 2

Warehouse: 20

LOW STOCK

Oil Filter

Shop: 1

Warehouse: 5

LOW STOCK

\`\`\`

**### Recent Invoices**

Show the latest few invoices with customer, amount, payment status, and date.

Do not build a large analytics dashboard for V1.

\---

**# 8. Customer Management**

Customer information should remain lightweight.

**## Fields**

\`\`\`text

id

name

phone

address (optional)

notes (optional)

created\_at

updated\_at

\`\`\`

**## Features**

\- Create customer

\- Edit customer

\- Search by name/phone

\- View customer history

\- View invoices

\- View outstanding balance

\- View previous jobs

**## Customer profile**

\`\`\`text

Rahul Das

987XXXXXXX

Jobs: 18

Billed: ₹82,400

Paid: ₹70,000

Due: ₹12,400

Recent Jobs

──────────────

Brake Service       ₹2,450

General Service     ₹6,200

Oil Change          ₹1,850

\`\`\`

\---

**# 9. Vehicle Information**

Do **\*\*not\*\*** build a complicated vehicle management system for V1.

The client only needs basic identification.

Recommended fields:

\`\`\`text

vehicle\_type

vehicle\_name / model (optional)

registration\_number (optional)

notes (optional)

\`\`\`

Vehicle type options:

\`\`\`text

Car

Bike

Scooty

Auto

Other

\`\`\`

A vehicle record can still be linked to a customer so history can be displayed later.

If the client later requests detailed service history per vehicle, a richer vehicle model can be introduced without redesigning the entire system.

\---

**# 10. Job / Service Card**

The **\*\*Job\*\*** is the central business entity.

**## Job status**

Keep the workflow small:

\`\`\`text

RECEIVED

IN\_PROGRESS

READY

COMPLETED

CANCELLED

\`\`\`

Do not add complicated approval stages.

**## Job fields**

\`\`\`text

id

job\_number

customer\_id

vehicle\_id

complaint

work\_notes

odometer\_reading (optional)

status

created\_at

updated\_at

completed\_at

\`\`\`

**## Create Job UX**

The form should be minimal and **single-flow**:

\`\`\`text

New Job

Customer
[ Search customer... ]

[ Existing customer ]

or

[ + Create New Customer ]

Vehicle
[ Car ▼ ]

Complaint / Work
[ Brake noise ]

[ Create Job ]

\`\`\`

### Inline customer creation

If the customer does not exist, do **not** navigate away from the job flow.

\`\`\`text

New Job
   ↓
Search customer
   ↓
Not found
   ↓
[ + Create New Customer ]
   ↓
Bottom sheet / modal
   ↓
Enter name + phone
   ↓
[ Create & Continue ]
   ↓
Customer created
   ↓
Automatically selected in New Job
   ↓
Continue job creation

\`\`\`

The owner should complete customer creation and job creation in one continuous flow. Do not force a separate Customer → Back → Job workflow.

\---

**# 11. Job Details UX**

\`\`\`text

JOB #1024

Rahul

Car

Brake noise

──────────────────

Parts Used

Brake Pad       + Add

Brake Cleaner   + Add

──────────────────

Labour

Brake Service   + Add

──────────────────

Total

₹2,550

[ COMPLETE JOB ]

\`\`\`

The job page should be a working checklist, not a complex form.

\---

**# 12. Parts Used in Jobs**

When the owner adds a part to a job, the system checks **\*\*Shop Stock\*\***.

Example:

\`\`\`text

Brake Pad

Shop Stock: 6

Quantity

[ 2 ]

[ Add ]

\`\`\`

The part is associated with the job immediately, but stock is **\*\*not deducted yet\*\***.

When the job is completed:

\`\`\`text

Shop Stock = Shop Stock - quantity used

\`\`\`

This matches the client's requirement that stock is finalized when the job is done.

\---

**# 13. Handling Insufficient Shop Stock**

Example:

\`\`\`text

Brake Pad

Shop Stock: 1

Required: 3

Warehouse: 20

\`\`\`

Instead of forcing the owner to navigate to another page, show:

\`\`\`text

Only 1 available in Shop

Warehouse has 20

[ Move 2 to Shop ]

\`\`\`

The transfer should automatically:

\`\`\`text

Warehouse: 20 → 18

Shop: 1 → 3

\`\`\`

Then return the user to the job.

**## Important rule**

V1 should **\*\*prevent negative shop stock\*\*** by default.

\---

**# 14. Inventory Model**

There are exactly two physical locations:

\`\`\`text

SHOP

WAREHOUSE

\`\`\`

Keep them separate in the data model even though the UI presents them under one Inventory area.

Example:

\`\`\`text

Brake Pad

Shop:       4

Warehouse: 25

Total:     29

\`\`\`

**## Recommended UI**

Do not create two large unrelated navigation items.

Use one Inventory page:

\`\`\`text

Inventory

[ Shop ] [ Warehouse ]

Search parts...

Brake Pad       4

Oil Filter      2

Air Filter      8

\`\`\`

Switching tabs changes the current location.

On desktop the location switch can be a segmented control.

On mobile it should be a large, easy-to-tap segmented control.

\---

**# 15. Parts Management**

**## Fields**

\`\`\`text

id

category\_id

name

part\_number

brand (optional)

purchase\_price

selling\_price

minimum\_shop\_stock

minimum\_warehouse\_stock

unit

barcode (optional)

description (optional)

created\_at

updated\_at

\`\`\`

**## Features**

\- Add part

\- Edit part

\- Search by name

\- Search by part number

\- Search by brand

\- View Shop Stock

\- View Warehouse Stock

\- View total stock

\- View movement history

\- Archive part when it has historical usage

\---

**# 16. Categories**

Example:

\`\`\`text

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

\`\`\`

Only basic CRUD is needed.

\---

**# 17. Shop Stock**

Shop Stock is the inventory physically available inside the garage.

It is the stock used by jobs.

Example:

\`\`\`text

Brake Pad

Stock: 4

Minimum: 5

Status: LOW

\`\`\`

The system should highlight low stock but should also show warehouse availability.

Important distinction:

\`\`\`text

Shop low + Warehouse available

        \= Transfer

Shop low + Warehouse empty

        \= Purchase / restock later

\`\`\`

\---

**# 18. Warehouse Stock**

Warehouse Stock is reserve inventory.

Operations:

\- Add stock

\- Adjust stock

\- Search

\- View stock

\- View movement history

\- Transfer to shop

Warehouse is not directly consumed by a job.

The normal path is:

\`\`\`text

Warehouse → Shop → Job

\`\`\`

\---

**# 19. Stock Transfer**

Because there is only one warehouse and one shop, the transfer UX should be extremely simple.

\`\`\`text

Move Stock

Part

[ Brake Pad ]

Warehouse Available

25

Quantity

[ 5 ]

[ Move to Shop ]

\`\`\`

After confirmation:

\`\`\`text

Warehouse: 20

Shop: 9

\`\`\`

Do not implement:

\`\`\`text

Request → Approve → Dispatch → Receive

\`\`\`

The owner controls both locations, so that workflow is unnecessary.

\---

**# 20. Stock Movements / Audit Trail**

Never rely only on a current quantity.

Every stock-changing operation should create a movement record.

**## Movement Types**

\`\`\`text

STOCK\_IN

JOB\_USAGE

TRANSFER\_IN

TRANSFER\_OUT

RETURN

DAMAGE

ADJUSTMENT

\`\`\`

Example:

\`\`\`text

18 Aug 2026 09:30

+20 Brake Pad

STOCK\_IN

18 Aug 2026 11:15

-5 Brake Pad

TRANSFER\_OUT

Warehouse → Shop

18 Aug 2026 14:10

-1 Brake Pad

JOB\_USAGE

JOB-1024

\`\`\`

This gives the owner a reliable answer to:

\> Why is my stock different from what I expected?

\---

**# 21. Suppliers**

Supplier management should remain lightweight because the client owns the warehouse and shop.

**## Fields**

\`\`\`text

id

name

phone

address (optional)

notes (optional)

created\_at

updated\_at

\`\`\`

V1 only needs to support recording where stock came from. No complex purchase-order system is required.

\---

**# 22. Invoice Management**

Invoices are generated from completed jobs.

**## Invoice content**

\`\`\`text

Business Name

Business Address / Phone

Invoice Number

Invoice Date

Customer Name

Customer Phone

Vehicle Type / Details

Job Number

Parts

Labour

Subtotal

Discount

Total

Paid

Due

Payment Status

\`\`\`

No GST/tax engine is required for V1.

**## Invoice status**

\`\`\`text

ISSUED

PARTIALLY\_PAID

PAID

CANCELLED

\`\`\`

**## Invoice numbering**

Use a human-readable number:

\`\`\`text

INV-2026-000001

INV-2026-000002

\`\`\`

Historical invoice item prices must be stored on the invoice/job item itself.

If a Brake Pad costs ₹1,800 when the job is created and later changes to ₹2,000, the old invoice must still show ₹1,800.

\---

**# 23. Payment and Credit**

Payment is a separate entity because one invoice can have multiple payments.

Example:

\`\`\`text

Invoice Total: ₹10,000

Payment 1: ₹3,000

Payment 2: ₹2,000

Payment 3: ₹5,000

Outstanding: ₹0

\`\`\`

**## Payment methods**

\`\`\`text

CASH

UPI

CARD

BANK\_TRANSFER

OTHER

\`\`\`

**## Payment states**

\`\`\`text

PAID

PARTIAL

CREDIT

\`\`\`

**## Payment UX**

After completing a job:

\`\`\`text

Invoice Total

₹2,550

Payment

○ Paid

○ Partial

○ Credit

Amount Paid

[ 2,000 ]

[ Save Invoice ]

\`\`\`

Do not force the owner through a separate payment-management workflow for normal billing.

\---

**# 24. Reports**

Reports should be practical, not overly analytical.

Top-level filter:

\`\`\`text

[ Today ] [ Week ] [ Month ] [ Year ]

\`\`\`

**## Daily / Weekly / Monthly / Yearly metrics**

\- Jobs completed

\- Total billed

\- Total collected

\- Outstanding credit

\- Number of invoices

\- Parts consumed

Example:

\`\`\`text

Monthly

Billed

₹4,85,200

Collected

₹4,10,000

Outstanding

₹75,200

Jobs

142

\`\`\`

Definitions:

\- **\*\*Billed\*\*** = invoice amount generated.

\- **\*\*Collected\*\*** = money actually received.

\- **\*\*Outstanding\*\*** = invoice totals minus confirmed payments.

\---

**# 25. Customer History**

The customer profile should show useful history without becoming a CRM.

\`\`\`text

Rahul Das

987XXXXXXX

Billed      ₹82,400

Paid        ₹70,000

Outstanding ₹12,400

Recent Jobs

──────────────

18 Aug

Brake Service

₹2,450

12 Jun

Oil Change

₹1,850

\`\`\`

\---

**# 26. Mobile-First UX**

The client is replacing paper and pen, so the app must be extremely easy to use.

**## Mobile navigation**

\`\`\`text

Dashboard | Jobs | Inventory | More

\`\`\`

**## Primary action**

\`\`\`text

\+ New Job

\`\`\`

**## Mobile principles**

\- Large touch targets.

\- Minimal typing.

\- Search first.

\- Bottom sheets for quick selections.

\- Sticky primary actions.

\- Cards instead of wide tables.

\- Clear status labels.

\- Avoid unnecessary filters.

\- Avoid long multi-step forms.

\- Preserve user input if a network request fails.

\- Keep the most common actions within easy thumb reach.

**## Desktop**

Use a sidebar and denser tables while keeping the same information hierarchy.

\`\`\`text

Desktop → Sidebar + Content

Mobile  → Bottom navigation + full-screen pages

\`\`\`

\---

**# 27. Recommended Screens**

**## Authentication**

\`\`\`text

Login

\`\`\`

**## Home**

\`\`\`text

Dashboard

\`\`\`

**## Jobs**

\`\`\`text

Job List

Create Job

Job Details

Complete Job

\`\`\`

**## Customers**

\`\`\`text

Customer List

Create Customer

Customer Details

\`\`\`

**## Inventory**

\`\`\`text

Inventory Overview

Parts

Categories

Shop / Warehouse stock switch

Transfer Stock

Stock Movements

Suppliers

\`\`\`

**## Invoices**

\`\`\`text

Invoice List

Invoice Details

Payment History

Outstanding Credit

\`\`\`

**## Reports**

\`\`\`text

Today

Week

Month

Year

\`\`\`

**## More**

\`\`\`text

Customers
Invoices
Reports
Settings

Admin Profile
Logout

\`\`\`

**## Settings**

\`\`\`text

Business Profile
Invoice Settings
Admin Profile

\`\`\`

**## Developer Superadmin**

This area is completely separate from the normal garage application and is available only to the developer/operator.

\`\`\`text

/superadmin

Overview
System Health
Database Health
API Health
Alerts
Admins
Activity
System Info

\`\`\`

\---

**# 28. Final Technology Stack**

For this project, the recommended stack is a **\*\*Next.js modular monolith\*\***.

**## Application**

\`\`\`text

Next.js

TypeScript

React

App Router

\`\`\`

**## UI**

\`\`\`text

Tailwind CSS

shadcn/ui

Lucide Icons

\`\`\`

**## Client data fetching / caching**

\`\`\`text

TanStack Query

\`\`\`

Use it for:

\- Cached inventory lists

\- Jobs

\- Customers

\- Reports

\- Search results

\- Targeted cache invalidation

**## Forms / validation**

\`\`\`text

React Hook Form

Zod

\`\`\`

**## Database**

\`\`\`text

PostgreSQL

Drizzle ORM

\`\`\`

**## Authentication**

Keep authentication simple but support two fixed roles: `ADMIN` and `SUPERADMIN`. A secure session/cookie-based implementation is sufficient.

**## PWA**

Make the application installable as a Progressive Web App.

Native Android/iOS apps are not required for V1.

\---

**# 29. Why Next.js for This Project**

Next.js is appropriate here because:

\- There is one web application.

\- The business has a small number of admin accounts; the developer has a separate superadmin account.

\- No SEO requirement exists for private screens.

\- A separate backend deployment is unnecessary.

\- Server-side business logic can live in one codebase.

\- Route Handlers can expose clean API endpoints where needed.

\- Server Actions can be used selectively for simple internal mutations.

\- Vercel can deploy the complete Next.js application.

\- The project remains a real full-stack application because database operations, transactions, validation, authorization, reporting, and business rules live on the server.

Do **\*\*not\*\*** use Next.js simply because it is popular. The reason is that a single deployable monolith fits the actual constraints of this client.

\---

**# 30. Next.js Application Architecture**

\`\`\`text

                         Client Browser / PWA

                                  │

                                  ▼

                           Vercel / Next.js

                                  │

                ┌─────────────────┼─────────────────┐

                │                 │                 │

                ▼                 ▼                 ▼

              UI          Route Handlers      Server Logic

                │                 │                 │

                └─────────────────┼─────────────────┘

                                  │

                            Service Layer

                                  │

                              Drizzle ORM

                                  │

                                  ▼

                              PostgreSQL

\`\`\`

Keep business logic out of React components.

Recommended server structure:

\`\`\`text

src/

├── app/

│   ├── (auth)/

│   ├── dashboard/

│   ├── jobs/

│   ├── customers/

│   ├── inventory/

│   ├── invoices/

│   ├── reports/

│   └── api/

│

├── components/

├── features/

├── server/

│   ├── services/

│   │   ├── job.service.ts

│   │   ├── inventory.service.ts

│   │   ├── invoice.service.ts

│   │   ├── payment.service.ts

│   │   └── report.service.ts

│   ├── repositories/

│   ├── db/

│   │   ├── schema/

│   │   └── migrations/

│   └── auth/

│

├── lib/

├── hooks/

└── types/

\`\`\`

\---

**# 31. Hosting / Deployment**

A separate Railway/Render backend is **\*\*not required\*\***.

Recommended production architecture:

\`\`\`text

                User in India

                     │

                     ▼

              Vercel / Next.js

                     │

             Server-side logic

                     │

                     ▼

              PostgreSQL Database

\`\`\`

Use a managed PostgreSQL provider with a region close to the client. For an India-based client, an India region is preferable when available.

A practical low-cost option is:

\`\`\`text

Vercel

   ↓

Next.js application

   ↓

Managed PostgreSQL (for example Supabase PostgreSQL)

\`\`\`

The important architectural point is that **\*\*Vercel hosts the Next.js frontend and server-side code, but PostgreSQL still lives in a database service\*\***.

No Railway deployment is necessary just to host an API.

\---

**# 32. Performance Strategy**

The client's workload is modest:

\- Approximately 50–60 customers/jobs per day.

\- Continuous stock updates.

\- One owner/admin.

\- One shop.

\- One warehouse.

This is not a high-throughput system. Correctness and perceived speed matter more than massive infrastructure.

**## Do not optimize by adding infrastructure first.**

Optimize the application with:

**### 1. Database indexes**

Index common lookups:

\`\`\`text

customers.phone

parts.part\_number

parts.name

jobs.job\_number

jobs.status

invoices.invoice\_number

invoices.created\_at

stock\_movements.part\_id

stock\_movements.created\_at

payments.customer\_id

\`\`\`

**### 2. Server-side pagination**

Do not load thousands of rows into the browser.

Example:

\`\`\`text

GET /api/inventory/shop?page=1&limit=25

\`\`\`

**### 3. Server-side search**

\`\`\`text

GET /api/parts/search?q=brake

\`\`\`

Do not download the entire part catalogue just to search locally.

**### 4. TanStack Query caching**

Use cached data so returning to a page feels immediate.

**### 5. Targeted cache invalidation**

After a job is completed, invalidate only the relevant data:

\`\`\`text

jobs

shop-stock

customer-balance

invoice

 dashboard summary

\`\`\`

**### 6. Optimistic updates where safe**

For simple non-critical UI actions, update the interface immediately and reconcile with the server.

For critical financial/inventory operations, the server remains authoritative.

\---

**# 33. Business-Critical Transactions**

These operations must be atomic.

**## Complete Job**

\`\`\`text

BEGIN

1\. Validate job status.

2\. Validate part quantities.

3\. Validate shop stock.

4\. Deduct shop stock.

5\. Create JOB\_USAGE movements.

6\. Mark job completed.

7\. Finalize invoice.

8\. Record initial payment if provided.

COMMIT

\`\`\`

If any step fails:

\`\`\`text

ROLLBACK

\`\`\`

The system must never end up with:

\`\`\`text

Job completed

but stock not deducted

\`\`\`

or:

\`\`\`text

Stock deducted

but invoice not created

\`\`\`

**## Warehouse → Shop transfer**

\`\`\`text

BEGIN

Validate warehouse quantity

Deduct warehouse

Add shop stock

Create TRANSFER\_OUT

Create TRANSFER\_IN

Create transfer record

COMMIT

\`\`\`

\---

**# 34. Data Model**

Recommended tables:

\`\`\`text

users

Recommended user fields:

```text
id
email
password_hash / auth_reference
role                # ADMIN | SUPERADMIN
status              # ACTIVE | DISABLED
last_login_at
last_activity_at
created_at
updated_at
```

customers

vehicles

jobs

job\_parts

job\_labour

categories

parts

suppliers

inventory\_locations

inventory\_balances

stock\_movements

stock\_transfers

stock\_transfer\_items

invoices

invoice\_items

payments

settings

audit_logs
system_health_checks
system_alerts
\`\`\`

**## Inventory locations**

Even though V1 has exactly two locations, use a location table instead of hardcoding columns such as \`shop\_stock\` and \`warehouse\_stock\`.

\`\`\`text

inventory\_locations

\-------------------

id

name

code

location\_type

created\_at

\`\`\`

Rows:

\`\`\`text

1 | Main Shop      | SHOP      | SHOP

2 | Main Warehouse | WAREHOUSE | WAREHOUSE

\`\`\`

**## Inventory balances**

\`\`\`text

inventory\_balances

\------------------

id

part\_id

location\_id

quantity

updated\_at

\`\`\`

Example:

\`\`\`text

Brake Pad

SHOP      → 4

WAREHOUSE → 25

\`\`\`

This keeps the model simple today and extensible later.

\---

**# 35. Core Relationships**

\`\`\`text

customers

   1 ───── N vehicles

customers

   1 ───── N jobs

vehicles

   1 ───── N jobs

jobs

   1 ───── N job\_parts

   1 ───── N job\_labour

   1 ───── 1 invoice

parts

   1 ───── N job\_parts

   1 ───── N stock\_movements

   1 ───── N inventory\_balances

inventory\_locations

   1 ───── N inventory\_balances

invoices

   1 ───── N payments

customers

   1 ───── N invoices

\`\`\`

\---

**# 36. API / Server Operations**

Use clear server boundaries even inside a Next.js monolith.

**## Auth**

\`\`\`text

POST /api/auth/login

POST /api/auth/logout

GET  /api/auth/me

\`\`\`

**## Customers**

\`\`\`text

GET   /api/customers

POST  /api/customers

GET   /api/customers/\:id

PATCH /api/customers/\:id

\`\`\`

**## Jobs**

\`\`\`text

GET  /api/jobs

POST /api/jobs

GET  /api/jobs/\:id

PATCH /api/jobs/\:id

POST /api/jobs/\:id/complete

\`\`\`

**## Parts**

\`\`\`text

GET   /api/parts

POST  /api/parts

GET   /api/parts/\:id

PATCH /api/parts/\:id

\`\`\`

**## Inventory**

\`\`\`text

GET  /api/inventory

GET  /api/inventory/low-stock

GET  /api/inventory/movements

POST /api/inventory/stock-in

POST /api/inventory/adjust

POST /api/inventory/transfers

\`\`\`

**## Invoices / Payments**

\`\`\`text

GET  /api/invoices

GET  /api/invoices/\:id

POST /api/invoices/\:id/payments

GET  /api/invoices/\:id/pdf

\`\`\`

**## Reports**

\`\`\`text

GET /api/reports/daily

GET /api/reports/weekly

GET /api/reports/monthly

GET /api/reports/yearly

\`\`\`

**## Superadmin / Platform Operations**

All endpoints in this section require the `SUPERADMIN` role.

\`\`\`text

GET    /api/superadmin/health
GET    /api/superadmin/health/database
GET    /api/superadmin/health/api
GET    /api/superadmin/alerts
GET    /api/superadmin/activity
GET    /api/superadmin/admins
POST   /api/superadmin/admins
PATCH  /api/superadmin/admins/:id
DELETE /api/superadmin/admins/:id
GET    /api/superadmin/system
\`\`\`

The superadmin layer is for **observability and operational control**, not normal garage operations.

For internal mutations, Server Actions can be used selectively, but critical business operations should still be organized in reusable server-side services.

\---

**# 37. Security**

Minimum V1:

\- Secure admin authentication.

\- HttpOnly secure session cookies where applicable.

\- Server-side authorization checks.

\- Server-side validation with Zod.

\- Parameterized database queries / ORM protection.

\- Rate limiting on authentication endpoints.

\- Never trust client-submitted invoice totals.

\- Never trust client-submitted stock quantities.

\- Never trust client-submitted payment balances.

\- Keep secrets server-side.

The browser is not the source of truth.

The server/database is the source of truth.

**Role model**

Use two explicit roles:

```text
ADMIN
SUPERADMIN
```

- `ADMIN` is the garage/customer-side operator.
- `SUPERADMIN` is the developer/operator of the platform.
- Superadmin routes and APIs must perform server-side role checks.
- Hiding `/superadmin` in the UI is not a security control.
- Prefer disabling an admin account over hard deletion when historical ownership or audit records would otherwise be affected.


\---

**# 38. PDF Invoice**

Generate the invoice from trusted server-side data.

Include:

\`\`\`text

Business name

Contact details

Invoice number

Date

Customer

Vehicle

Job number

Parts

Labour

Subtotal

Discount

Total

Paid

Due

Payment status

Notes

\`\`\`

Actions:

\`\`\`text

View PDF

Download PDF

Print

Share PDF

\`\`\`

\---

**# 39. Offline / PWA Strategy**

V1 should be **\*\*online-first\*\***.

Do not build full offline synchronization before the core system works.

The PWA should still:

\- Cache the app shell.

\- Open when previously visited even if temporarily offline.

\- Show online/offline state.

\- Preserve form data where practical.

\- Clearly tell the user when a save cannot reach the server.

Full offline job creation + conflict resolution + sync is a future feature.

This is intentionally deferred because it introduces substantial complexity.

\---

**# 40. Error Handling UX**

Errors should be understandable to the owner.

Bad:

\`\`\`text

500 Internal Server Error

\`\`\`

Good:

\`\`\`text

Could not complete this job.

Shop stock changed before the job was completed.

Please review the parts and try again.

\`\`\`

For destructive actions, explain what happened and what the user can do next.

\---

**# 41. Loading and Empty States**

Avoid blank screens.

Examples:

\`\`\`text

Loading shop stock...

\`\`\`

\`\`\`text

No jobs today.

Create a new job to get started.

\`\`\`

\`\`\`text

No low-stock parts.

Everything is currently above minimum stock.

\`\`\`

Use skeletons for list/table loading where useful.

\---

**# 42. Testing Strategy**

**## Unit tests**

Test:

\- Invoice calculation.

\- Payment balance.

\- Credit balance.

\- Low-stock calculation.

\- Transfer quantity validation.

\- Stock deduction logic.

**## Integration tests**

Test the actual database workflows:

\- Create customer.

\- Create job.

\- Add parts.

\- Complete job.

\- Deduct shop stock.

\- Generate invoice.

\- Record payment.

\- Transfer warehouse → shop.

**## Critical cases**

\- Transfer greater than warehouse stock.

\- Job uses more than shop stock.

\- Duplicate completion request.

\- Duplicate payment request.

\- Payment greater than outstanding balance.

\- Job cancellation.

\- Invoice generation failure.

\- Concurrent inventory updates.

\- Part price changed after job creation.

\---

**# 43. Important Business Rules**

1\. The garage admin owns the business workflow; developer superadmin is a separate platform role.

2\. Shop and warehouse stock are separate quantities.

3\. Jobs consume parts from Shop Stock.

4\. Warehouse stock is moved to Shop before normal job consumption when Shop Stock is insufficient.

5\. Stock cannot become negative by default.

6\. Stock changes must create movement records.

7\. Job parts do not deduct stock until job completion.

8\. Completing a job and deducting stock must be atomic.

9\. Invoice creation/finalization and critical stock deductions should be transaction-safe.

10\. Payment history must be independent of the invoice total.

11\. Historical invoices must preserve historical item prices.

12\. Avoid deleting records that are referenced by historical financial/stock records.

13\. Keep the UI focused on business tasks, not database concepts.

\---

**# 44. V1 Feature Scope**

**## Must Have**

\- [x] Admin login

\- [x] Developer superadmin access

\- [x] Dashboard

\- [x] Customers

\- [x] Minimal vehicle information

\- [x] Job creation

\- [x] Job status

\- [x] Labour entries

\- [x] Parts used in jobs

\- [x] Parts management

\- [x] Categories

\- [x] Shop stock

\- [x] Warehouse stock

\- [x] Warehouse → Shop transfer

\- [x] Stock movements

\- [x] Low-stock alerts

\- [x] Supplier records

\- [x] Invoice generation

\- [x] PDF invoice

\- [x] Payment recording

\- [x] Partial payments

\- [x] Credit tracking

\- [x] Customer history

\- [x] Daily report

\- [x] Weekly report

\- [x] Monthly report

\- [x] Yearly report

\- [x] Responsive mobile-first UI

\- [x] PWA

**## Future / Optional**

\- [ ] Barcode scanning

\- [ ] WhatsApp invoice sharing

\- [ ] Service reminders

\- [ ] Customer notifications

\- [ ] Multiple staff

\- [ ] Fine-grained role-based permissions

\- [ ] Multiple branches

\- [ ] Multiple warehouses

\- [ ] GST/tax workflows

\- [ ] Expense tracking

\- [ ] Profit reporting

\- [ ] Photo attachments

\- [ ] Detailed vehicle service records

\- [ ] Full offline synchronization

\- [ ] Purchase order workflow

\---

**# 45. Features Explicitly Out of Scope for V1**

Do not introduce these unless the client actually asks for them:

\- Microservices

\- Kubernetes

\- Kafka

\- Elasticsearch

\- Redis just for the sake of using Redis

\- Complex ERP workflows

\- Payroll

\- Full accounting software

\- Multi-company architecture

\- Advanced procurement workflows

\- Complex RBAC beyond the fixed ADMIN / SUPERADMIN role model

\- AI forecasting

\- Full customer portal

\- Native mobile applications

The client's workload does not justify these technologies.

\---

**# 46. Development Phases**

**## Phase 1 — Foundation**

\- Next.js project setup

\- TypeScript

\- Tailwind + shadcn/ui

\- PostgreSQL connection

\- Drizzle ORM

\- Migrations

\- Admin authentication

\- Base layout

\- Mobile navigation

\- PWA foundation

**## Phase 2 — Customers & Jobs**

\- Customers

\- Minimal vehicle info

\- Job creation

\- Job details

\- Job statuses

\- Labour

\- Job search

**## Phase 3 — Inventory**

\- Categories

\- Parts

\- Shop stock

\- Warehouse stock

\- Stock in

\- Stock adjustment

\- Low stock

\- Stock movements

**## Phase 4 — Transfers**

\- Warehouse → Shop transfer

\- Transfer validation

\- Atomic transfer transaction

\- Transfer history

\- In-job transfer shortcut

**## Phase 5 — Billing**

\- Job completion

\- Stock deduction

\- Invoice finalization

\- Payments

\- Credit

\- PDF generation

**## Phase 6 — Dashboard & Reports**

\- Dashboard summaries

\- Daily report

\- Weekly report

\- Monthly report

\- Yearly report

\- Customer outstanding report

**## Phase 7 — Production Polish**

\- Mobile optimization

\- PWA installability

\- Loading states

\- Empty states

\- Error states

\- Performance tuning

\- Security review

\- Automated tests

\- Production deployment

\---

**# 47. Recommended Implementation Order**

Build the business foundation before the dashboard.

\`\`\`text

1\. Database schema

2\. Authentication

3\. Customers

4\. Jobs

5\. Parts / Categories

6\. Inventory balances

7\. Stock movements

8\. Warehouse → Shop transfer

9\. Job part usage

10\. Job completion transaction

11\. Invoices

12\. Payments / Credit

13\. Dashboard

14\. Reports

15\. PDF

16\. PWA / mobile polish

17\. Tests / production hardening

\`\`\`

The dashboard should be built after the underlying data flows exist so that its metrics represent real business data.

\---

**# 48. Example End-to-End Scenario**

**## Initial stock**

\`\`\`text

Brake Pad

Warehouse = 20

Shop      = 2

\`\`\`

**## Customer arrives**

\`\`\`text

Rahul

Vehicle: Car

Complaint: Brake noise

\`\`\`

Create:

\`\`\`text

JOB-1024

\`\`\`

**## Work is added**

\`\`\`text

Labour:

Brake service = ₹500

Parts:

Brake Pad × 3 = ₹5,400

\`\`\`

Shop has only 2.

The UI shows:

\`\`\`text

Shop has 2

Required 3

Warehouse has 20

[ Move 1 to Shop ]

\`\`\`

Transfer:

\`\`\`text

Warehouse: 19

Shop: 3

\`\`\`

The owner adds the third part to the job.

**## Complete job**

The server transaction:

\`\`\`text

Check job status

Check Shop Stock = 3

Deduct Shop Stock by 3

Create JOB\_USAGE movements

Finalize job

Create invoice

Record payment if provided

Commit

\`\`\`

Final stock:

\`\`\`text

Warehouse = 19

Shop      = 0

\`\`\`

Invoice:

\`\`\`text

Parts       ₹5,400

Labour        ₹500

\------------------

Total       ₹5,900

Paid        ₹5,000

Due           ₹900

\`\`\`

The owner gets:

\`\`\`text

[ Download PDF ]

\`\`\`

This is the core product experience the entire application should optimize for.

\---

**# 49. Final Architecture Decision**

**## Application**

\`\`\`text

Next.js + TypeScript

\`\`\`

**## Frontend/UI**

\`\`\`text

React

Tailwind CSS

shadcn/ui

TanStack Query

React Hook Form

Zod

\`\`\`

**## Server**

\`\`\`text

Next.js Route Handlers

Next.js server-side services

Selective Server Actions

\`\`\`

**## Database**

\`\`\`text

PostgreSQL

Drizzle ORM

\`\`\`

**## Hosting**

\`\`\`text

Vercel

   ↓

Next.js application + server-side logic

   ↓

Managed PostgreSQL

\`\`\`

A separate Railway/Render backend is **\*\*not required\*\***.

**## Mobile**

\`\`\`text

PWA

\`\`\`

**## Architecture style**

\`\`\`text

Modular Monolith

\`\`\`

Not microservices.

\---



**# 50.1 Developer Superadmin / Platform Control Plane**

The Superadmin area is for the **developer/operator of the platform**, not the garage owner.

Its purpose is to answer four questions quickly:

1. Is the customer's application healthy?
2. Is the database healthy?
3. Are there errors or abnormal conditions?
4. Can I safely manage the customer's admin access?

Do **not** turn this into a second business dashboard.

**## Superadmin navigation**

```text
Superadmin

Overview
Health
Alerts
Admins
Activity
System Info
```

**## Overview**

Show only operationally useful information:

```text
System Status       ● Healthy
API                 ● Healthy
Database            ● Healthy

Active Admins       1
Recent Errors       0
Open Alerts         1
App Version         1.0.0
Last Health Check   30s ago
```

**## Admin observation**

The developer should be able to see a compact operational snapshot of each garage admin:

```text
Garage Admin
Status            ACTIVE
Last Login        Today, 10:42 AM
Last Activity     Today, 12:18 PM
Jobs Today        14
Invoices Today    11
Last Request      2 min ago
```

Do not duplicate the entire customer's business dashboard here. The purpose is operational visibility.

**## API health**

At minimum track:

- Overall API health
- Health-check latency
- Error count
- Recent failed requests
- Slow endpoints
- Last successful health check

Example:

```text
API Health
● Healthy

Latency             84 ms
Errors today         2
Slow requests        1
Last check           12:18 PM
```

**## Database health**

Monitor lightweight health signals:

- Connectivity
- Query latency
- Connection usage
- Recent database errors
- Storage usage when available
- Last successful database health check

Example:

```text
Database
● Healthy

Latency            23 ms
Connections         4
Failed Queries      0
Storage           142 MB
```

**## Smart DB alerts**

Alerts should be rule-based and actionable, not noisy.

Recommended conditions:

```text
Database unreachable
        → CRITICAL

Database latency above threshold
        → WARNING

Connection usage above threshold
        → WARNING

Storage usage above threshold
        → WARNING

Repeated database failures
        → CRITICAL
```

Every alert should contain:

```text
Severity
Condition
First detected
Last detected
Current value
Threshold
Status
```

Example:

```text
WARNING
Database latency is above 500 ms
Current: 742 ms
Detected: 12:14 PM
Status: OPEN
```

Do not attempt complex AI-based forecasting in V1. Simple deterministic rules are more reliable for this application's scale.

**## Admin management**

Superadmin can:

- Create admin
- Disable admin
- Enable admin
- Reset admin access
- View last login
- View last activity
- Delete admin when safe

Prefer **disable** over hard deletion as the default operational action.

**## Activity / audit log**

Superadmin should see a compact activity stream such as:

```text
12:18  Admin completed JOB-1042
12:12  Admin transferred 5 Brake Pads
11:50  Admin created customer Rahul
11:31  Admin generated INV-2026-00018
10:42  Admin logged in
```

Audit important actions such as:

- Login / logout
- Admin account creation / disable / enable
- Job completion
- Stock transfer
- Stock adjustment
- Invoice finalization
- Payment recording
- Important settings changes
- Failed authentication attempts

**## System information**

Keep this minimal:

```text
App Version
Environment
Next.js version
Database status
Deployment timestamp
Last migration status
```

Do not expose secrets, raw database credentials, JWT secrets, or private environment values.

---

**# 50.2 Mobile UX Update**

The primary mobile navigation is:

```text
┌──────────────────────────────────────────┐
│ Dashboard │ Jobs │ Inventory │ More     │
└──────────────────────────────────────────┘
```

The `More` area contains lower-frequency modules:

```text
More

Customers
Invoices
Reports
Settings
Admin Profile
Logout
```

This keeps the most frequently used garage actions within thumb reach while reducing navigation clutter.

**## Customer creation inside New Job**

The user should never be forced into:

```text
Create Customer
→ Save
→ Navigate Back
→ Create Job
```

Use:

```text
New Job
   ↓
Search customer
   ↓
Customer not found
   ↓
Create New Customer
   ↓
Bottom sheet / modal
   ↓
Create & Continue
   ↓
Customer automatically selected
   ↓
Complete the job form
   ↓
Create Job
```

Only collect the minimum required customer fields during the inline flow:

```text
Name
Phone
```

Optional customer fields can still be edited later from the customer profile.

**## Mobile UX rules**

- Bottom navigation for primary modules.
- `More` for secondary modules.
- Bottom sheets for quick creation and selection.
- Sticky primary actions.
- Large touch targets.
- Minimal typing.
- Preserve entered job data while creating a customer.
- Do not reset the job form after inline customer creation.

---

**# 50.3 Updated Role Model**

The product has two fixed roles in V1.1:

```text
ADMIN
SUPERADMIN
```

**ADMIN**

The garage/customer-side operator. Can use the normal application modules:

```text
Dashboard
Jobs
Inventory
Customers
Invoices
Reports
Settings
```

**SUPERADMIN**

The developer/operator. Can access the developer control plane:

```text
Superadmin Overview
System Health
Database Health
API Health
Alerts
Admin Management
Activity / Audit
System Info
```

Superadmin does not need normal garage navigation unless explicitly required for support/debugging.

---

**# 50.4 Updated V1.1 Data Model Additions**

Add the minimum platform-management structures required for the developer control plane:

```text
users
  └── role: ADMIN | SUPERADMIN
  └── status: ACTIVE | DISABLED
  └── last_login_at
  └── last_activity_at

audit_logs
system_health_checks
system_alerts
```

**audit_logs** should record who performed important platform or business actions, what action occurred, when it occurred, and enough metadata to diagnose problems.

**system_health_checks** should record health-check results and timestamps for API/database monitoring.

**system_alerts** should record alert severity, condition, threshold, current value, first detected time, last detected time, and resolution state.

Do not store secrets or sensitive credential material in these operational tables.

---

**# 50.5 Updated V1.1 Scope**

**## New / Must Have**

- [ ] Developer superadmin authentication
- [ ] Fixed `ADMIN` / `SUPERADMIN` role separation
- [ ] Superadmin overview
- [ ] API health monitoring
- [ ] Database health monitoring
- [ ] Smart rule-based DB alerts
- [ ] Admin create
- [ ] Admin disable / enable
- [ ] Admin access reset
- [ ] Admin delete when safe
- [ ] Admin last login / activity visibility
- [ ] Activity / audit log
- [ ] System information view
- [ ] Inline customer creation during New Job
- [ ] Updated mobile bottom navigation
- [ ] More menu for Customers / Invoices / Reports / Settings

**## Explicitly Not Included**

- [ ] AI-based anomaly prediction
- [ ] Complex role/permission builder
- [ ] Full ERP administration
- [ ] Separate backend service for superadmin
- [ ] Full product analytics platform
- [ ] Exposing raw Neon/Vercel credentials to superadmin UI

---

**# 50.6 Updated Development Phases**

Keep the original business implementation order, then add the new platform/control-plane work after the core system is stable.

```text
1. Database schema
2. Authentication
3. Customers
4. Jobs
5. Parts / Categories
6. Inventory balances
7. Stock movements
8. Warehouse → Shop transfer
9. Job part usage
10. Job completion transaction
11. Invoices
12. Payments / Credit
13. Dashboard
14. Reports
15. PDF
16. Mobile / PWA polish
17. Production hardening
18. Developer Superadmin foundation
19. Admin management
20. API health
21. Database health
22. Smart DB alerts
23. Activity / audit log
24. Inline customer creation in New Job
25. Final mobile navigation polish
26. Superadmin production hardening
```

Do not build the superadmin dashboard before the underlying production data and health signals exist. Otherwise it will only show fake or low-value metrics.

**# 50. Final Product Principle**

The software should make the owner's day easier, not teach him software engineering.

The owner should be able to think:

\`\`\`text

Customer came

→ Create Job

→ Add work

→ Add parts

→ Finish

→ Invoice

→ Payment

\`\`\`

And when stock is needed:

\`\`\`text

Shop doesn't have it

→ Move from Warehouse

→ Continue Job

\`\`\`

Everything else should stay in the background.

The strongest technical parts of the project should be invisible to the garage owner. The developer/operator may see a separate Superadmin control plane for observability and access management.

The strongest technical parts of the project should be invisible to the user:

\- PostgreSQL transactions

\- Inventory consistency

\- Server-side validation

\- Cached queries

\- Indexed search

\- Atomic stock transfers

\- Atomic job completion

\- Secure authentication

\- Reliable invoice/payment calculations

That is the right balance between **\*\*simple UX\*\*** and **\*\*serious full-stack engineering\*\***.
