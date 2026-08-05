import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function requireAdminSession() {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email || !adminEmail || email !== adminEmail) {
    return null
  }
  return { email, session }
}
