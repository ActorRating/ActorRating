import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  try {
    console.log("🔎 Finding users missing usernames...")
    const users = await prisma.user.findMany({
      where: { OR: [{ username: null }, { username: "" }] },
      select: { id: true, name: true, email: true },
    })
    console.log(`Found ${users.length} user(s) to backfill`)

    const { generateUniqueUsername } = await import("@/lib/utils")

    for (const u of users) {
      try {
        const base = u.name || u.email || undefined
        const username = await generateUniqueUsername(base)
        await prisma.user.update({ where: { id: u.id }, data: { username } })
        console.log(`✅ ${u.id} → ${username}`)
      } catch (e) {
        console.error(`⚠️ Failed for ${u.id}`, e)
      }
    }

    console.log("🎉 Backfill complete")
  } catch (e) {
    console.error("❌ Backfill failed", e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()






