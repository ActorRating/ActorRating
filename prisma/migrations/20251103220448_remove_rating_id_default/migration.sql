-- Remove any default on Rating.id (IDs are set by the application).
ALTER TABLE "public"."Rating" ALTER COLUMN "id" DROP DEFAULT;
