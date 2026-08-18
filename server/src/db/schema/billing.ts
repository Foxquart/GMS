import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { customers, vehicles } from './customers';
import { serviceJobs } from './jobs';

// ─── Enums ───────────────────────────────────────────────────────────
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'CASH',
  'UPI',
  'CARD',
  'BANK_TRANSFER',
  'OTHER',
]);

// ─── Invoices ────────────────────────────────────────────────────────
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: varchar('invoice_number', { length: 30 }).notNull().unique(),
  jobId: uuid('job_id').notNull().references(() => serviceJobs.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  discount: numeric('discount', { precision: 10, scale: 2 }).notNull().default('0'),
  tax: numeric('tax', { precision: 10, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0'),
  paidAmount: numeric('paid_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  dueAmount: numeric('due_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  status: invoiceStatusEnum('status').notNull().default('DRAFT'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_invoices_invoice_number').on(table.invoiceNumber),
  index('idx_invoices_customer_id').on(table.customerId),
  index('idx_invoices_created_at').on(table.createdAt),
  index('idx_invoices_status').on(table.status),
]);

// ─── Invoice Items ───────────────────────────────────────────────────
export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  itemType: varchar('item_type', { length: 20 }).notNull(), // 'labour' | 'part'
  description: varchar('description', { length: 255 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
});

// ─── Payments ────────────────────────────────────────────────────────
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_payments_customer_id').on(table.customerId),
  index('idx_payments_invoice_id').on(table.invoiceId),
  index('idx_payments_created_at').on(table.createdAt),
]);
