-- Safety migration for Supabase -> Prisma auth rollout:
-- allow existing production rows without mapped user IDs to remain valid
-- during phased backfill/login migration.
ALTER TABLE "public"."Performance" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "public"."Rating" ALTER COLUMN "userId" DROP NOT NULL;
