/**
 * One-shot script: seed JOKER2026 invite code with maxUses: 50.
 * Run with: npx tsx prisma/seed-invite.ts
 *
 * Owner is resolved via ADMIN_EMAIL, else the earliest user.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const CODE = "JOKER2026"
const MAX_USES = 50

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const owner =
    (adminEmail
      ? await prisma.user.findUnique({
          where: { email: adminEmail },
          select: { id: true, email: true, username: true },
        })
      : null) ??
    (await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, username: true },
    }))

  if (!owner) {
    throw new Error("No user found to own the invite code.")
  }

  console.log(`Using owner: ${owner.username ?? owner.email} (${owner.id})`)

  const existing = await prisma.inviteCode.findUnique({
    where: { code: CODE },
    select: { id: true, maxUses: true, usedCount: true },
  })

  if (existing) {
    const updated = await prisma.inviteCode.update({
      where: { code: CODE },
      data: { maxUses: MAX_USES },
      select: { code: true, maxUses: true, usedCount: true },
    })
    console.log(`Updated existing code:`, updated)
    return
  }

  const created = await prisma.inviteCode.create({
    data: {
      code: CODE,
      ownerId: owner.id,
      maxUses: MAX_USES,
      usedCount: 0,
    },
    select: { code: true, maxUses: true, usedCount: true },
  })
  console.log(`Created:`, created)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
