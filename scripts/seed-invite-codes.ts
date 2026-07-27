/**
 * Bootstrap admin-owned invite codes before enabling INVITE_GATE_ENABLED.
 *
 * Usage:
 *   npx tsx scripts/seed-invite-codes.ts
 *   npx tsx scripts/seed-invite-codes.ts --count=20
 *
 * Requires ADMIN_EMAIL matching an existing User.
 */
import { PrismaClient } from "@prisma/client"
import { randomBytes } from "crypto"

const prisma = new PrismaClient()

function generateInviteCode(prefix = "CRAFT"): string {
  const suffix = randomBytes(3).toString("hex").toUpperCase().slice(0, 4)
  return `${prefix}-${suffix}`
}

async function main() {
  const countArg = process.argv.find((a) => a.startsWith("--count="))
  const count = Math.min(Math.max(Number(countArg?.split("=")[1] ?? "10") || 10, 1), 100)

  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  if (!email) throw new Error("ADMIN_EMAIL is required")

  const owner = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })
  if (!owner) throw new Error(`No User for ADMIN_EMAIL=${email}`)

  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateInviteCode()
      try {
        await prisma.inviteCode.create({ data: { code, ownerId: owner.id } })
        codes.push(code)
        break
      } catch {
        // retry on unique collision
      }
    }
  }

  console.log(`Created ${codes.length} invite codes for ${owner.email}:`)
  for (const c of codes) {
    console.log(`  ${c}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
