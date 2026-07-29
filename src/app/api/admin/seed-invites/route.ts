export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

async function requireAdmin() {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email || !adminEmail || email !== adminEmail) return null
  return prisma.user.findUnique({ where: { email }, select: { id: true } })
}

/**
 * POST /api/admin/seed-invites
 * Body: { prefix: string; count: number }
 * Creates `count` invite codes: prefix, prefix-2, prefix-3, …
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { prefix, count } = (await request.json()) as {
    prefix?: string
    count?: number
  }

  if (!prefix || typeof prefix !== "string") {
    return NextResponse.json({ error: "prefix is required" }, { status: 400 })
  }

  const total = Math.min(Math.max(Number(count) || 1, 1), 200)
  const codes = Array.from({ length: total }, (_, i) =>
    i === 0 ? prefix.toUpperCase() : `${prefix.toUpperCase()}-${i + 1}`,
  )

  let created = 0
  let skipped = 0

  for (const code of codes) {
    try {
      await prisma.inviteCode.create({ data: { code, ownerId: admin.id } })
      created++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ created, skipped, total: codes.length })
}
