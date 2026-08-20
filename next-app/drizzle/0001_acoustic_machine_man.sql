ALTER TABLE "jobs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "jobs" SET "status" = 'OPEN' WHERE "status" IN ('RECEIVED', 'IN_PROGRESS', 'READY');--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'OPEN'::text;--> statement-breakpoint
DROP TYPE "public"."job_status";--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('OPEN', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'OPEN'::"public"."job_status";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DATA TYPE "public"."job_status" USING "status"::"public"."job_status";