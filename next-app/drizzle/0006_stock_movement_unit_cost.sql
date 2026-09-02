ALTER TABLE "stock_movements" ADD COLUMN "unit_cost" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
-- Rows written before the column existed have no captured cost, and the real
-- one is unrecoverable. Today's purchase price is the only figure available —
-- which is precisely the drifting number this column exists to stop using, so
-- this is an approximation and knowingly so.
--
-- It still beats leaving them at 0, which would read as "these parts were
-- free" and overstate margin on every period reaching back before this
-- migration. Any period spanning the cutover mixes snapshot and re-priced
-- cost.
UPDATE "stock_movements" sm
SET "unit_cost" = p."purchase_price"
FROM "parts" p
WHERE p."id" = sm."part_id";--> statement-breakpoint
CREATE INDEX "idx_jobs_completed_at" ON "jobs" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_payments_created_at" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_type_created_at" ON "stock_movements" USING btree ("movement_type","created_at");
