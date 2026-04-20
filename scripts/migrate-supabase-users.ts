import { PrismaClient } from "@prisma/client"

/**
 * Backfills Auth.js users from Supabase auth.users into public.User.
 *
 * Requirements:
 * - Supabase auth schema still exists in the same Postgres database.
 * - DATABASE_URL points to that production database.
 *
 * Usage:
 *   npm run db:migrate-supabase-users
 */
async function main() {
  const prisma = new PrismaClient()

  try {
    const result = await prisma.$executeRawUnsafe(`
      INSERT INTO "public"."User" ("id", "email", "name", "createdAt", "updatedAt")
      SELECT
        au.id::text,
        lower(au.email),
        COALESCE(NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''), NULLIF(trim(au.raw_user_meta_data->>'name'), '')),
        COALESCE(au.created_at, NOW()),
        NOW()
      FROM auth.users au
      WHERE au.email IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "public"."User" pu
          WHERE pu.email = lower(au.email)
             OR pu.id = au.id::text
        );
    `)

    console.log(`[migrate-supabase-users] inserted rows: ${result}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("[migrate-supabase-users] failed:", err)
  process.exit(1)
})
