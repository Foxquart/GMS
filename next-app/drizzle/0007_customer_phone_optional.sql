ALTER TABLE "customers" ALTER COLUMN "phone" DROP NOT NULL;
--> statement-breakpoint
-- While the column was NOT NULL the only way to record "no phone" was a blank
-- string, and a blank string is not the same value as NULL to any of the read
-- paths: it renders as an empty line instead of "No phone on file", and it
-- builds a `tel:` link that dials nothing. Fold the two representations into
-- one now, while there is a single writer of this column.
UPDATE "customers" SET "phone" = NULL WHERE btrim("phone") = '';
