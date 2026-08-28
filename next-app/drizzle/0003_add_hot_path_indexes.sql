CREATE INDEX "idx_categories_name" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_invoice_items_invoice_id" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_job_id" ON "invoices" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_labour_job_id" ON "job_labour" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_parts_job_id" ON "job_parts" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_location_id" ON "stock_movements" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_stock_transfer_items_transfer_id" ON "stock_transfer_items" USING btree ("transfer_id");