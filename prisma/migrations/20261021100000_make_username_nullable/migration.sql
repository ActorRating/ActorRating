-- Make username nullable so the Prisma adapter can create new users during OAuth
-- and magic-link sign-up without requiring a username upfront.
-- Users set their username during the onboarding step (after first login).
ALTER TABLE "public"."User" ALTER COLUMN "username" DROP NOT NULL;
