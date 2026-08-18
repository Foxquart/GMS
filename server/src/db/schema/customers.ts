import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// ─── Customers ───────────────────────────────────────────────────────
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_customers_phone').on(table.phone),
  index('idx_customers_name').on(table.name),
]);

// ─── Vehicles ────────────────────────────────────────────────────────
export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  registrationNumber: varchar('registration_number', { length: 20 }).notNull(),
  make: varchar('make', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  variant: varchar('variant', { length: 100 }),
  year: varchar('year', { length: 4 }),
  fuelType: varchar('fuel_type', { length: 20 }),
  vin: varchar('vin', { length: 50 }),
  currentOdometer: varchar('current_odometer', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_vehicles_registration').on(table.registrationNumber),
  index('idx_vehicles_customer_id').on(table.customerId),
]);
