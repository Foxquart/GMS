import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { customers, vehicles } from './customers';
import { parts } from './inventory';

// ─── Enums ───────────────────────────────────────────────────────────
export const jobStatusEnum = pgEnum('job_status', [
  'RECEIVED',
  'INSPECTION',
  'IN_PROGRESS',
  'READY',
  'COMPLETED',
  'CANCELLED',
]);

// ─── Service Jobs ────────────────────────────────────────────────────
export const serviceJobs = pgTable('service_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobNumber: varchar('job_number', { length: 20 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  complaint: text('complaint'),
  inspectionNotes: text('inspection_notes'),
  workNotes: text('work_notes'),
  odometerReading: varchar('odometer_reading', { length: 20 }),
  status: jobStatusEnum('status').notNull().default('RECEIVED'),
  estimatedTotal: numeric('estimated_total', { precision: 10, scale: 2 }),
  actualTotal: numeric('actual_total', { precision: 10, scale: 2 }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_service_jobs_job_number').on(table.jobNumber),
  index('idx_service_jobs_status').on(table.status),
  index('idx_service_jobs_customer_id').on(table.customerId),
  index('idx_service_jobs_vehicle_id').on(table.vehicleId),
]);

// ─── Job Labour ──────────────────────────────────────────────────────
export const jobLabour = pgTable('job_labour', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => serviceJobs.id),
  description: varchar('description', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Job Parts (price snapshot) ──────────────────────────────────────
export const jobParts = pgTable('job_parts', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => serviceJobs.id),
  partId: uuid('part_id').notNull().references(() => parts.id),
  partName: varchar('part_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
