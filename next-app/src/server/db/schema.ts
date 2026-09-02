import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  index,
  pgEnum,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────
export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "CAR",
  "BIKE",
  "SCOOTY",
  "AUTO",
  "OTHER",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "OPEN",
  "COMPLETED",
  "CANCELLED",
]);

export const locationTypeEnum = pgEnum("location_type", [
  "WAREHOUSE",
  "SHOP",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "STOCK_IN",
  "JOB_USAGE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "RETURN",
  "DAMAGE",
  "ADJUSTMENT",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "OTHER",
]);

// ─── Users ───────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("ADMIN"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_users_email").on(table.email),
]);

// ─── Customers ───────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_customers_phone").on(table.phone),
  index("idx_customers_name").on(table.name),
]);

// ─── Vehicles (minimal) ──────────────────────────────────────────────
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  vehicleType: vehicleTypeEnum("vehicle_type").notNull().default("OTHER"),
  vehicleName: varchar("vehicle_name", { length: 255 }),
  registrationNumber: varchar("registration_number", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_vehicles_customer_id").on(table.customerId),
]);

// ─── Categories ──────────────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_categories_name").on(table.name),
]);

// ─── Sub-categories ──────────────────────────────────────────────────
/**
 * A part *type* — "back lamp", "clutch cable" — which is deliberately not
 * owned by a single category. One "back lamp" row is linked to Royal Enfield
 * and to Pulsar through `categorySubCategories`, rather than being duplicated
 * once per category. A sub-category with no links is meaningless and the
 * service refuses to create one.
 */
export const subCategories = pgTable("sub_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_sub_categories_name").on(table.name),
]);

/**
 * The many-to-many link. `onDelete: "cascade"` on both sides so removing
 * either end never strands a row here — the pairing has no meaning without
 * both of its ends.
 */
export const categorySubCategories = pgTable("category_sub_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  subCategoryId: uuid("sub_category_id")
    .notNull()
    .references(() => subCategories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_category_sub_categories_pair").on(table.categoryId, table.subCategoryId),
  index("idx_category_sub_categories_category_id").on(table.categoryId),
  index("idx_category_sub_categories_sub_category_id").on(table.subCategoryId),
]);

// ─── Suppliers ───────────────────────────────────────────────────────
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Parts ───────────────────────────────────────────────────────────
export const parts = pgTable("parts", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id),
  /**
   * Optional refinement of `categoryId`. Nullable because parts predate
   * sub-categories and a category is perfectly usable on its own; when it is
   * set, the service checks the pair is actually linked.
   */
  subCategoryId: uuid("sub_category_id").references(() => subCategories.id),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  name: varchar("name", { length: 255 }).notNull(),
  partNumber: varchar("part_number", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).notNull().default("0"),
  minimumShopStock: integer("minimum_shop_stock").notNull().default(5),
  minimumWarehouseStock: integer("minimum_warehouse_stock").notNull().default(10),
  unit: varchar("unit", { length: 20 }).notNull().default("pcs"),
  barcode: varchar("barcode", { length: 100 }),
  description: text("description"),
  /**
   * Free-form spec sheet: [{ label, value }, ...]. Workshops track different
   * things per part — thread pitch, viscosity, fitment — so this stays open
   * rather than forcing a fixed column per attribute.
   */
  attributes: jsonb("attributes").$type<{ label: string; value: string }[]>().notNull().default([]),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_parts_name").on(table.name),
  index("idx_parts_part_number").on(table.partNumber),
  index("idx_parts_category_id").on(table.categoryId),
  index("idx_parts_sub_category_id").on(table.subCategoryId),
]);

// ─── Inventory Locations ─────────────────────────────────────────────
export const inventoryLocations = pgTable("inventory_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  locationType: locationTypeEnum("location_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Inventory Balances ──────────────────────────────────────────────
export const inventoryBalances = pgTable("inventory_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  partId: uuid("part_id").notNull().references(() => parts.id),
  locationId: uuid("location_id").notNull().references(() => inventoryLocations.id),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_inventory_balances_part_id").on(table.partId),
  index("idx_inventory_balances_location_id").on(table.locationId),
  uniqueIndex("idx_inventory_balances_part_location").on(table.partId, table.locationId),
]);

// ─── Stock Movements ─────────────────────────────────────────────────
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  partId: uuid("part_id").notNull().references(() => parts.id),
  locationId: uuid("location_id").notNull().references(() => inventoryLocations.id),
  movementType: movementTypeEnum("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  /**
   * What one unit was worth when this row was written.
   *
   * Cost figures used to join `parts.purchase_price` at read time, so editing
   * a part's price retroactively rewrote the cost of every job that had ever
   * consumed it — last quarter's margin moved because someone corrected a
   * price today. Snapshotting at write time is what stops that.
   *
   * This is replacement cost at the moment of the movement, NOT FIFO: if a
   * part was bought at ₹200 and the purchase price is later raised to ₹250, a
   * later JOB_USAGE of the old units is valued at ₹250. Costing the specific
   * units consumed would need cost layers this schema does not carry.
   */
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_stock_movements_part_id").on(table.partId),
  index("idx_stock_movements_location_id").on(table.locationId),
  index("idx_stock_movements_created_at").on(table.createdAt),
  // Every consumption figure in the app filters on movement_type AND a date
  // window; the created_at index alone cannot discriminate the type, so each
  // one scanned rows it would immediately discard.
  index("idx_stock_movements_type_created_at").on(table.movementType, table.createdAt),
]);

// ─── Stock Transfers ─────────────────────────────────────────────────
export const stockTransfers = pgTable("stock_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromLocationId: uuid("from_location_id").notNull().references(() => inventoryLocations.id),
  toLocationId: uuid("to_location_id").notNull().references(() => inventoryLocations.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockTransferItems = pgTable("stock_transfer_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  transferId: uuid("transfer_id").notNull().references(() => stockTransfers.id),
  partId: uuid("part_id").notNull().references(() => parts.id),
  quantity: integer("quantity").notNull(),
}, (table) => [
  index("idx_stock_transfer_items_transfer_id").on(table.transferId),
]);

// ─── Jobs ────────────────────────────────────────────────────────────
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobNumber: varchar("job_number", { length: 20 }).notNull().unique(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  complaint: text("complaint"),
  workNotes: text("work_notes"),
  odometerReading: varchar("odometer_reading", { length: 20 }),
  status: jobStatusEnum("status").notNull().default("OPEN"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_jobs_job_number").on(table.jobNumber),
  index("idx_jobs_status").on(table.status),
  index("idx_jobs_customer_id").on(table.customerId),
  index("idx_jobs_vehicle_id").on(table.vehicleId),
  // Jobs-completed counts and the turnaround average both window on this.
  index("idx_jobs_completed_at").on(table.completedAt),
]);

// ─── Job Labour ──────────────────────────────────────────────────────
export const jobLabour = pgTable("job_labour", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobs.id),
  description: varchar("description", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_job_labour_job_id").on(table.jobId),
]);

// ─── Job Parts (price snapshot) ──────────────────────────────────────
export const jobParts = pgTable("job_parts", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobs.id),
  partId: uuid("part_id").notNull().references(() => parts.id),
  partName: varchar("part_name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_job_parts_job_id").on(table.jobId),
]);

// ─── Invoices ────────────────────────────────────────────────────────
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: varchar("invoice_number", { length: 30 }).notNull().unique(),
  jobId: uuid("job_id").notNull().references(() => jobs.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  dueAmount: numeric("due_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: invoiceStatusEnum("status").notNull().default("ISSUED"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_invoices_invoice_number").on(table.invoiceNumber),
  // listJobs runs three correlated subqueries per row against this column;
  // without the index each one sequentially scans the whole invoices table.
  index("idx_invoices_job_id").on(table.jobId),
  index("idx_invoices_customer_id").on(table.customerId),
  index("idx_invoices_created_at").on(table.createdAt),
  index("idx_invoices_status").on(table.status),
]);

// ─── Invoice Items ───────────────────────────────────────────────────
export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  itemType: varchar("item_type", { length: 20 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
}, (table) => [
  index("idx_invoice_items_invoice_id").on(table.invoiceId),
]);

// ─── Payments ────────────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_payments_customer_id").on(table.customerId),
  index("idx_payments_invoice_id").on(table.invoiceId),
  // Collected-in-period, and the payment-method breakdown beside it.
  index("idx_payments_created_at").on(table.createdAt),
]);

// ─── Settings ────────────────────────────────────────────────────────
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessName: varchar("business_name", { length: 255 }).notNull().default("My Garage"),
  businessPhone: varchar("business_phone", { length: 50 }),
  businessAddress: text("business_address"),
  invoicePrefix: varchar("invoice_prefix", { length: 10 }).notNull().default("INV"),
  invoiceTerms: text("invoice_terms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Platform Control Plane Tables (V1.1) ───────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  userName: varchar("user_name", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 100 }),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_audit_logs_user_id").on(table.userId),
  index("idx_audit_logs_action").on(table.action),
  index("idx_audit_logs_created_at").on(table.createdAt),
]);

export const systemHealthChecks = pgTable("system_health_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkType: varchar("check_type", { length: 50 }).notNull(), // API | DATABASE
  status: varchar("status", { length: 20 }).notNull(), // HEALTHY | DEGRADED | UNHEALTHY
  latencyMs: integer("latency_ms").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_health_checks_created_at").on(table.createdAt),
]);

export const systemAlerts = pgTable("system_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  severity: varchar("severity", { length: 20 }).notNull(), // CRITICAL | WARNING | INFO
  condition: varchar("condition", { length: 255 }).notNull(),
  threshold: varchar("threshold", { length: 100 }),
  currentValue: varchar("current_value", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("OPEN"), // OPEN | RESOLVED
  firstDetectedAt: timestamp("first_detected_at", { withTimezone: true }).notNull().defaultNow(),
  lastDetectedAt: timestamp("last_detected_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_system_alerts_status").on(table.status),
]);