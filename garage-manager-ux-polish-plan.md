# Garage Manager — UX Polish & Interaction Plan

## 1. Purpose

This document is the implementation plan for polishing the existing Garage Manager mobile-first application.

The goal is **not** to redesign the product into a larger ERP or add more features. The goal is to make the existing application feel:

- simple enough for a single garage owner replacing paper-and-pen
- fast on a phone
- obvious without training
- action-oriented instead of data-oriented
- visually consistent and polished
- rich through useful interactions, not unnecessary complexity

The product should behave like a **digital notebook for a garage owner**, not an enterprise inventory system.

The core business flow remains:

```text
Customer
  ↓
Job / Service
  ↓
Labour + Parts
  ↓
Complete Job
  ↓
Invoice
  ↓
Payment / Credit
```

Inventory remains a supporting workflow:

```text
Warehouse
  ↓
Transfer
  ↓
Shop Stock
  ↓
Parts Used in Job
```

The existing product requirements explicitly prioritize a simple owner-operated workflow, one shop, one warehouse, minimal typing, large touch targets, search-first interactions, bottom sheets, sticky primary actions, cards instead of wide tables, and clear states. The UX polish must preserve those constraints.

---

# 2. UX North Star

## The application should answer three questions immediately

### What do I need to do?

Examples:

- Continue an active job
- Complete a ready job
- Collect a payment
- Move stock to the shop
- Add a new customer

### What needs my attention?

Examples:

- Low shop stock
- Unpaid invoice
- Job waiting for completion
- Stock shortage during a job

### What just happened?

Examples:

- Part added
- Stock transferred
- Job completed
- Invoice created
- Payment recorded

The interface should avoid making the owner think in technical concepts such as stock movements, transaction types, inventory balances, IDs, repositories, or internal statuses.

---

# 3. Non-Negotiable UX Rules

## Rule 1 — One screen, one dominant task

Every screen must have one obvious primary action.

Examples:

- Jobs → `+ New Job`
- Customers → `+ New Customer`
- Inventory → `+ New Part`
- Job details → `Complete Job`
- Customer details → `New Job` or `Record Payment` depending on state

Do not create multiple competing primary buttons.

## Rule 2 — Hide complexity

The owner should see:

```text
Move 2 to Shop
```

not:

```text
Create transfer → select source → select destination → create transfer item → confirm
```

## Rule 3 — Prefer contextual actions

The user should not leave the current workflow to perform a related operation.

Example:

```text
Job
  ↓
Shop stock insufficient
  ↓
Move required quantity from warehouse
  ↓
Return automatically to Job
```

## Rule 4 — Minimize typing

Prefer:

- search
- remembered values
- sensible defaults
- selectable options
- steppers
- bottom sheets
- recently used items

## Rule 5 — Every important action gives immediate feedback

Successful actions should use a toast, inline confirmation, status change, or visual transition.

## Rule 6 — Do not add UI just because data exists

A field existing in the database does not mean it deserves equal prominence in the interface.

## Rule 7 — No unnecessary confirmation dialogs

Confirm only actions where an accidental tap could cause meaningful damage.

## Rule 8 — Mobile first means thumb first

Primary controls should be reachable near the bottom of the screen and should have comfortable touch targets.

---

# 4. Global Design System Polish

Create one reusable UI language before polishing individual screens.

## 4.1 Typography

Suggested hierarchy:

- Page title: 28–32px, strong weight
- Section title: 16–18px, semibold/bold
- Body: 15–16px
- Secondary text: 13–14px
- Metric value: 26–34px depending on importance
- Button label: 15–16px, semibold/bold

Avoid using large bold text for everything. Strong typography should communicate hierarchy.

## 4.2 Spacing

Use a consistent spacing scale.

Recommended base values:

```text
4   micro spacing
8   tight spacing
12  compact spacing
16  standard spacing
20  card spacing
24  section spacing
32  major section spacing
```

Do not tune margins separately on every screen.

## 4.3 Radius

Use a small set of radius values:

```text
Cards: 18–20px
Inputs: 12–14px
Buttons: 12–14px
Pills / status badges: full pill
Sheets: 24px top corners
```

## 4.4 Shadows

Keep shadows subtle. The existing soft card style is good, but do not increase shadow intensity to compensate for weak hierarchy.

## 4.5 Color semantics

Keep the current primary blue/indigo direction.

Use semantic colors consistently:

```text
Primary  → main action
Green    → success / paid / cleared
Amber    → warning / attention
Red      → dangerous / out of stock / failed
Neutral  → inactive / secondary information
```

Do not introduce many additional accent colors.

## 4.6 Touch targets

Interactive controls should generally have at least approximately 44–48px of touch area.

---

# 5. Global Interaction Components

Build or standardize these components before screen-level polish.

## 5.1 Bottom Sheet

Use for:

- customer selection
- vehicle selection
- part selection
- labour selection
- category selection
- payment method
- stock transfer
- status change
- quick actions

Bottom sheets should support:

- drag/close gesture
- clear title
- search when selection lists are long
- large tap areas
- one clear primary action when needed

## 5.2 Toast / Snackbar

Examples:

```text
✓ Customer saved
✓ Brake Pad added
✓ 2 items moved to shop
✓ Payment recorded
✓ Job completed
```

Keep messages short.

## 5.3 Inline Alert

Use for contextual problems rather than modal dialogs.

Example:

```text
Not enough stock in shop
Shop: 1    Needed: 3    Warehouse: 20
[ Move 2 to Shop ]
```

## 5.4 Skeleton Loading

Use for lists/cards when data loading is noticeable.

Avoid blank screens.

## 5.5 Empty State

Every empty state needs:

1. clear explanation
2. useful next action

Example:

```text
No jobs yet
Create a service job to get started.
[ + New Job ]
```

## 5.6 Error State

Never expose technical errors to the owner.

Bad:

```text
500 Internal Server Error
```

Good:

```text
Could not complete this job.
Shop stock changed before completion.
Please review the parts and try again.
```

---

# 6. Navigation Polish

## Primary mobile navigation

Use:

```text
Home | Jobs | Inventory | Customers | More
```

Move lower-frequency areas into `More`:

```text
Invoices
Reports
Suppliers
Settings
```

Do not put every module into bottom navigation.

## Navigation behavior

- Preserve scroll position when returning to a list.
- Preserve search/filter state where useful.
- Use full-screen pages for core tasks.
- Use bottom sheets for quick selections.
- Avoid deep navigation for common operations.

---

# 7. Dashboard Polish

## Current problem

The existing dashboard has visually strong metric cards, but too much of the first viewport is occupied by passive statistics.

The dashboard should become a **control center for today's work**.

## Recommended structure

```text
Good morning

₹18,450
Today's business

₹14,200 collected    ₹4,250 due

────────────────────

7 Active Jobs
2 Need Attention
5 Low Stock

────────────────────

ACTIVE JOBS

Rahul Das
Car · Brake Service
IN PROGRESS                     →

────────────────────

NEEDS ATTENTION

Brake Pad
Shop 1 · Needed 3
Warehouse 20
[ Move 2 to Shop ]

────────────────────

MONEY TO COLLECT

Rahul Das               ₹2,500
Amit Roy                ₹1,200

View outstanding →
```

## Dashboard rules

- Prioritize action over analytics.
- Keep the top financial summary compact.
- Show active work before less important historical information.
- Surface only useful exceptions.
- Do not add charts unless they help the owner make a decision.

---

# 8. Jobs UX — Highest Priority

The Jobs module should become the primary workflow experience.

## 8.1 Job list

Each job card should answer:

- Who?
- What vehicle?
- What work?
- Current status?
- How much?

Example:

```text
JOB-1024
Rahul Das
Car · Brake Service

₹5,900
IN PROGRESS                         →
```

Avoid showing technical metadata on the list.

## 8.2 New Job

The creation flow should be extremely short.

Recommended:

```text
New Job

Customer
[ Search customer ]  [ + New ]

Vehicle
[ Car ]

Complaint / Work
[ Brake noise ]

[ Create Job ]
```

The owner should be able to create a basic job in seconds.

## 8.3 Job details

Treat the screen like a checklist, not a form.

Recommended structure:

```text
← Job #1024

Rahul Das
Car
Brake noise

WORK

✓ Brake service
✓ Replace brake pad
+ Add work

PARTS

Brake Pad        ×2
Brake Cleaner    ×1

+ Add part

LABOUR

Brake Service    ₹500

+ Add labour

────────────────

TOTAL
₹5,900

[ Complete Job ]
```

## 8.4 Job action priority

The main CTA changes according to job state.

Examples:

```text
RECEIVED     → Start Work
IN PROGRESS  → Mark Ready
READY        → Complete Job
```

Do not expose raw backend terminology.

---

# 9. Add Part UX

When the user taps `+ Add Part`, open a bottom sheet.

```text
Add Part

[ Search parts... ]

Brake Pad
Shop 6 · Warehouse 24

Oil Filter
Shop 2 · Warehouse 12

Air Filter
Shop 8 · Warehouse 18
```

Selecting a part opens quantity controls:

```text
Brake Pad

Available in shop: 6

Quantity
[-]   1   [+]

[ Add Part ]
```

The part is attached to the job immediately but inventory is not deducted until job completion, preserving the existing business rule.

---

# 10. Stock Shortage UX — Critical Flow

This should be one of the most polished interactions in the entire application.

If a job needs 3 units and shop has 1:

```text
Not enough in shop

Shop        1
Needed      3
Warehouse  20

[ Move 2 to Shop ]
```

After the transfer:

```text
✓ 2 Brake Pads moved to shop
```

Then automatically return to the current job context.

The user should never need to manually navigate through Inventory for this situation.

Do not expose:

- source location selector
- destination location selector
- transfer status workflow
- transfer approval
- internal movement type

The owner controls both locations, so this would add complexity without business value.

---

# 11. Inventory UX

## 11.1 Inventory header

Keep:

```text
Stock Inventory
Manage shop and warehouse parts

[ SHOP STOCK ] [ WAREHOUSE STOCK ]
```

Then add a compact summary:

```text
42 parts · 7 low · 2 out of stock
```

## 11.2 Inventory card

Normal:

```text
Brake Pad
Bosch

Shop 8 · Warehouse 22
```

Low:

```text
Brake Pad
Bosch

Shop 2 · Warehouse 22
LOW STOCK

[ Move 3 to Shop ]
```

Critical:

```text
Brake Pad

Shop 0 · Warehouse 0
OUT OF STOCK
```

Only show contextual actions when they are relevant.

## 11.3 Inventory actions

Do not combine:

```text
Transfer + New Part + Floating + button
```

Use two explicit actions:

```text
[ Transfer Stock ]     [ + New Part ]
```

Remove the floating button from Inventory when those actions are visible.

## 11.4 Warehouse view

Warehouse is primarily for:

- stock in
- adjustment
- transfer to shop
- history

Do not make it look like a separate enterprise warehouse application.

---

# 12. New Part Form Simplification

The current form contains too many equally prominent fields.

Group them.

## BASIC

```text
Part Name *
Brand
Category
Unit
```

## PRICING

```text
Selling Price
Purchase Price
```

## STOCK

```text
Minimum Shop Stock
Minimum Warehouse Stock
```

## OPTIONAL

Hide by default behind:

```text
+ More details
```

Optional fields:

- part number
- description
- barcode

Use sensible defaults for:

- unit
- minimum stock thresholds where appropriate

Do not ask the owner to fill fields that are not required to start using the part.

---

# 13. Customer UX

The customer screen is already close to the correct direction. Avoid overengineering it.

## Customer card

Recommended:

```text
R
Rahul Das
98765 43210

5 jobs       ₹8,400 billed

₹1,200 due
```

If money is due:

```text
[ Record Payment ]
```

## Customer details

```text
Rahul Das
98765 43210

[ Call ] [ WhatsApp ]

₹8,400 billed
₹7,200 paid
₹1,200 due

────────────────

RECENT JOBS

Brake Service      ₹2,450
Oil Change         ₹1,850
General Service    ₹4,100
```

Provide contextual actions:

- Call
- WhatsApp
- New Job
- Record Payment

Do not turn this into a CRM.

---

# 14. Payment UX

Payment should happen directly in the job/invoice workflow.

Avoid making the owner open a separate payment-management module for normal billing.

After job completion:

```text
Invoice Total
₹2,550

Payment

○ Paid
○ Partial
○ Credit

Amount Paid
[ ₹2,550 ]

[ Save Invoice ]
```

For `Paid`, default the amount to the invoice total.

For `Partial`, show the remaining balance immediately.

Example:

```text
Paid ₹2,000
Remaining ₹550
```

---

# 15. Invoice UX

The important actions should be immediately visible:

```text
Invoice INV-2026-000021

₹5,900
PAID

[ View PDF ]
[ Share ]
[ Download ]
```

If unpaid:

```text
₹5,900
₹2,000 paid
₹3,900 due

[ Record Payment ]
```

Do not expose accounting internals.

---

# 16. Settings UX

Remove the generic floating `+` button from Settings.

Settings has one main action:

```text
[ Save Changes ]
```

Group fields into:

```text
Business Profile
Invoice Settings
Admin/Profile
```

Do not make Settings feel like another CRUD screen.

---

# 17. Global Smart Defaults

Add sensible defaults to reduce typing.

Examples:

### New Job

Remember recently used vehicle type where appropriate.

### Payment

Default paid amount to invoice total when `Paid` is selected.

### New Part

Provide normal default unit and sensible stock thresholds.

### Search

Remember the current search while navigating back from a detail screen where useful.

### Lists

Preserve scroll position when returning from a detail screen.

---

# 18. Quick Actions by Context

Every major entity should expose useful actions.

## Job

```text
Add Part
Add Labour
Mark Ready
Complete Job
```

## Customer

```text
Call
WhatsApp
New Job
Record Payment
```

## Part

```text
Transfer
Stock In
Adjust
Edit
```

## Invoice

```text
Record Payment
Share
Download
```

Never force the owner into unrelated navigation for an obvious action.

---

# 19. Micro-Interactions

Use motion to explain state, not to decorate the interface.

Recommended:

- bottom sheet slide-in
- subtle page transitions
- button press feedback
- success check animation
- number update animation for important totals
- stock quantity transition after transfer
- status badge transition when job status changes
- smooth expand/collapse for optional form sections

Keep animations short and restrained, approximately 150–250ms for normal transitions.

Do not add animated backgrounds, excessive parallax, or decorative motion.

---

# 20. Loading, Empty, Success and Error States

Every major screen needs four deliberate states.

## Loading

Use skeletons or concise loading text depending on duration.

## Empty

Always explain what is missing and what the user can do next.

## Success

Use short confirmation feedback.

Example:

```text
✓ Job completed
Invoice created
```

## Error

Explain:

1. what failed
2. why in business language
3. what to do next

Never expose stack traces, HTTP codes or database errors.

---

# 21. Forms UX Rules

All forms should follow this order:

```text
Required information
↓
Most common information
↓
Optional information
```

Rules:

- label every input clearly
- use useful placeholders
- avoid unnecessary helper text
- show validation close to the failing input
- keep entered values after recoverable errors
- use correct mobile keyboard types
- use numeric keyboard for quantities/prices
- use telephone keyboard for phone numbers
- avoid unnecessary dropdowns
- use searchable bottom sheets for long options

---

# 22. Destructive Action Rules

Do not confirm routine actions.

Confirm when an action can cause meaningful accidental loss.

Examples that may require confirmation:

- delete/archive part
- cancel a job
- destructive stock adjustment
- irreversible invoice cancellation

Example:

```text
Cancel this job?

The job will remain in history but will no longer be active.

[ Keep Job ]    [ Cancel Job ]
```

Do not use a generic `Are you sure?` message.

---

# 23. Accessibility and Mobile Usability Checklist

Check every screen for:

- touch targets approximately 44–48px or larger
- readable text at normal phone scale
- adequate contrast
- labels not relying only on color
- keyboard not covering the primary action
- sticky actions remaining visible while typing
- bottom navigation not overlapping content
- correct safe-area padding
- sufficient spacing around destructive actions
- clear focus states for keyboard users where relevant

---

# 24. PWA / Mobile Polish

The application should feel installed, not like a website squeezed into a phone.

Implement:

- app shell loading
- safe-area support
- mobile viewport handling
- persistent bottom navigation
- appropriate status bar appearance
- fast navigation between already visited screens
- offline indicator
- clear failed-save behavior
- preservation of form input when a request fails

The product remains online-first. Do not build full offline synchronization as part of this polish pass.

---

# 25. Do NOT Build During UX Polish

Do not add these just to make the product feel more advanced:

- analytics dashboards with multiple charts
- complicated inventory workflows
- multi-step stock transfers
- approval systems
- complex filters
- ERP-style tables on mobile
- multiple user roles
- multiple locations UI
- advanced procurement workflows
- AI recommendations
- forecasting
- complex notifications
- decorative animation
- excessive modal dialogs

These increase cognitive load without helping the single owner complete daily work faster.

---

# 26. Implementation Order

Do the polish in this exact order.

## Phase 1 — Shared UI foundation

- buttons
- inputs
- cards
- status badges
- bottom sheets
- toast/snackbar
- dialogs
- skeletons
- empty states
- error states
- spacing/typography tokens
- mobile safe-area behavior

## Phase 2 — Core Job flow

- New Job
- Job List
- Job Details
- Add Part sheet
- Add Labour sheet
- Stock shortage UI
- In-job transfer
- Complete Job
- Payment
- Invoice handoff

## Phase 3 — Inventory

- Shop/Warehouse switch
- inventory cards
- low-stock states
- out-of-stock states
- transfer sheet
- stock-in flow
- stock adjustment flow
- movement history

## Phase 4 — Dashboard

- compact financial summary
- active jobs
- attention items
- low-stock items
- outstanding payments
- recent activity

## Phase 5 — Customers

- customer cards
- customer details
- quick actions
- outstanding balance
- job history

## Phase 6 — Forms

- New Part
- New Customer
- New Job
- Settings

Reduce visible fields and add smart defaults.

## Phase 7 — Motion and feedback

- toasts
- success transitions
- status transitions
- bottom-sheet animations
- quantity transitions
- subtle loading states

## Phase 8 — Final mobile QA

Test the entire product on an actual phone.

---

# 27. Acceptance Criteria

The UX polish is complete only when all of the following are true.

## Core workflow

- A new job can be created in seconds.
- A customer can be found without navigating through multiple screens.
- Parts can be added from a bottom sheet.
- Labour can be added without a long form.
- Shop stock shortage can be resolved directly inside the job.
- Warehouse → Shop transfer returns the owner to the original task automatically.
- Completing a job clearly leads into invoice/payment.
- Payment can be recorded without entering a separate financial workflow.

## Inventory

- Shop and Warehouse are clearly separated.
- Low stock is immediately visible.
- Relevant transfer actions appear contextually.
- The owner does not need to understand stock movement types.
- Inventory cards communicate what action is needed.

## Navigation

- Bottom navigation contains only high-frequency areas.
- Secondary modules are grouped under More.
- No screen has competing primary actions.

## Forms

- Required fields are shown first.
- Optional fields do not dominate the screen.
- Common values have defaults.
- Numeric fields use numeric mobile keyboards.
- Recoverable errors preserve user input.

## Feedback

- Every major mutation has visible success/error feedback.
- No blank loading screens exist.
- Empty states provide a useful next step.
- Technical error messages never reach the owner.

## Mobile

- Buttons are comfortable to tap.
- Keyboard does not hide important actions.
- Bottom navigation does not overlap content.
- Primary actions are reachable by thumb.
- Scrolling and navigation feel natural on a real phone.

---

# 28. Final UX Principle

The strongest technical parts of Garage Manager should remain invisible.

The owner should experience only this:

```text
Customer came
      ↓
Create Job
      ↓
Add Work
      ↓
Add Parts
      ↓
Move Stock if needed
      ↓
Finish
      ↓
Invoice
      ↓
Payment
```

Everything else should stay in the background.

The goal is not to make the application look more sophisticated.

The goal is to make the owner **think less, tap less, type less, and finish work faster**.

That is the definition of a successful UX polish for this product.
