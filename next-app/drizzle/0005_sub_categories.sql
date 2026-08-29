CREATE TABLE "category_sub_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"sub_category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "sub_category_id" uuid;--> statement-breakpoint
ALTER TABLE "category_sub_categories" ADD CONSTRAINT "category_sub_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_sub_categories" ADD CONSTRAINT "category_sub_categories_sub_category_id_sub_categories_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_category_sub_categories_pair" ON "category_sub_categories" USING btree ("category_id","sub_category_id");--> statement-breakpoint
CREATE INDEX "idx_category_sub_categories_category_id" ON "category_sub_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_sub_categories_sub_category_id" ON "category_sub_categories" USING btree ("sub_category_id");--> statement-breakpoint
CREATE INDEX "idx_sub_categories_name" ON "sub_categories" USING btree ("name");--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_sub_category_id_sub_categories_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_parts_sub_category_id" ON "parts" USING btree ("sub_category_id");