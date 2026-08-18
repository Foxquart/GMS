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
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────
export const locationTypeEnum = pgEnum('location_type', ['WAREHOUSE', 'SHOP']);

export const movementTypeEnum = pgEnum('movement_type', [
  'PURCHASE',
  'JOB_USAGE',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'RETURN',
  'DAMAGE',
  'ADJUSTMENT',
]);

// ─── Categories ──────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Suppliers ───────────────────────────────────────────────────────
export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Parts ───────────────────────────────────────────────────────────
export const parts = pgTable('parts', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => categories.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  name: varchar('name', { length: 255 }).notNull(),
  partNumber: varchar('part_number', { length: 100 }),
  brand: varchar('brand', { length: 100 }),
  vehicleCompatibility: text('vehicle_compatibility'),
  purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }).notNull().default('0'),
  sellingPrice: numeric('selling_price', { precision: 10, scale: 2 }).notNull().default('0'),
  minimumShopStock: integer('minimum_shop_stock').notNull().default(5),
  minimumWarehouseStock: integer('minimum_warehouse_stock').notNull().default(10),
  unit: varchar('unit', { length: 20 }).notNull().default('pcs'),
  barcode: varchar('barcode', { length: 100 }),
  description: text('description'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_parts_name').on(table.name),
  index('idx_parts_part_number').on(table.partNumber),
  index('idx_parts_category_id').on(table.categoryId),
]);

// ─── Inventory Locations ─────────────────────────────────────────────
export const inventoryLocations = pgTable('inventory_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  locationType: locationTypeEnum('location_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Inventory Balances ──────────────────────────────────────────────
export const inventoryBalances = pgTable('inventory_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  partId: uuid('part_id').notNull().references(() => parts.id),
  locationId: uuid('location_id').notNull().references(() => inventoryLocations.id),
  quantity: integer('quantity').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_inventory_balances_part_id').on(table.partId),
  index('idx_inventory_balances_location_id').on(table.locationId),
]);

// ─── Stock Movements ─────────────────────────────────────────────────
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  partId: uuid('part_id').notNull().references(() => parts.id),
  locationId: uuid('location_id').notNull().references(() => inventoryLocations.id),
  movementType: movementTypeEnum('movement_type').notNull(),
  quantity: integer('quantity').notNull(),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_stock_movements_part_id').on(table.partId),
  index('idx_stock_movements_created_at').on(table.createdAt),
]);

// ─── Stock Transfers ─────────────────────────────────────────────────
export const stockTransfers = pgTable('stock_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromLocationId: uuid('from_location_id').notNull().references(() => inventoryLocations.id),
  toLocationId: uuid('to_location_id').notNull().references(() => inventoryLocations.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stockTransferItems = pgTable('stock_transfer_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  transferId: uuid('transfer_id').notNull().references(() => stockTransfers.id),
  partId: uuid('part_id').notNull().references(() => parts.id),
  quantity: integer('quantity').notNull(),
});
