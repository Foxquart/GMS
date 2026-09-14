ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "registration_number_normalized" varchar(20);
--> statement-breakpoint
UPDATE "vehicles"
SET "registration_number_normalized" = lower(regexp_replace("registration_number", '[\s-]', '', 'g'))
WHERE "registration_number" IS NOT NULL AND "registration_number_normalized" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_reg_normalized" ON "vehicles" USING btree ("registration_number_normalized");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_reg" ON "vehicles" USING btree ("registration_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parts_barcode" ON "parts" USING btree ("barcode");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_suppliers_name" ON "suppliers" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_movements_part_created" ON "stock_movements" USING btree ("part_id", "created_at");
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_name_trgm" ON "customers" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parts_name_trgm" ON "parts" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS job_number_seq;
--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;
--> statement-breakpoint
SELECT setval(
  'job_number_seq',
  COALESCE((SELECT MAX(CAST(SUBSTRING(job_number FROM '[0-9]+$') AS integer)) FROM jobs), 0) + 1,
  false
);
--> statement-breakpoint
SELECT setval(
  'invoice_number_seq',
  COALESCE((SELECT MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS integer)) FROM invoices), 0) + 1,
  false
);
