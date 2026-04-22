-- Allow null display names for auth resilience (OAuth/magic-link edge cases).
ALTER TABLE "public"."User" ALTER COLUMN "name" DROP NOT NULL;

-- Backfill existing null names to avoid legacy runtime assumptions.
UPDATE "public"."User"
SET "name" = 'User'
WHERE "name" IS NULL;
