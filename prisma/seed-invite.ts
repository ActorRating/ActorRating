/**
 * One-shot script: seed JOKER2026 invite code (50 uses = 50 rows).
 * Run with: npx tsx prisma/seed-invite.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, username: true },
  })

  if (!admin) {
    throw new Error("No ADMIN user found. Create one first.")
  }

  console.log(`Using admin: ${admin.username} (${admin.id})`)

  const codes = Array.from({ length: 50 }, (_, i) =>
    i === 0 ? "JOKER2026" : `JOKER2026-${i + 1}`,
  )

  let created = 0
  let skipped = 0

  for (const code of codes) {
    try {
      await prisma.inviteCode.create({
        data: { code, ownerId: admin.id },
      })
      created++
    } catch {
      // Already exists
      skipped++
    }
  }

  console.log(`Done. Created: ${created}, Skipped (already existed): ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
