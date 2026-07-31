export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { normalizeInviteCode } from "@/lib/invites"

async function requireAdmin() {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email || !adminEmail || email !== adminEmail) return null
  return prisma.user.findUnique({ where: { email }, select: { id: true } })
}

/**
 * POST /api/admin/seed-invites
 * Body: { code: string; maxUses: number }
 * Upserts a single multi-use invite code.
 * maxUses: 0 (or "unlimited") = unlimited redemptions.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json()) as {
    code?: string
    maxUses?: number | string
    /** @deprecated use code + maxUses */
    prefix?: string
    /** @deprecated use code + maxUses */
    count?: number
  }

  const code = normalizeInviteCode(body.code || body.prefix || "")
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 })
  }

  const rawMax = body.maxUses ?? body.count
  let maxUses: number
  if (
    rawMax === "unlimited" ||
    rawMax === "Unlimited" ||
    rawMax === "UNLIMITED" ||
    Number(rawMax) === 0
  ) {
    maxUses = 0
  } else {
    maxUses = Math.min(Math.max(Number(rawMax) || 1, 1), 10_000)
  }

  const existing = await prisma.inviteCode.findUnique({
    where: { code },
    select: { id: true, usedCount: true },
  })

  if (existing) {
    if (maxUses > 0 && maxUses < existing.usedCount) {
      return NextResponse.json(
        {
          error: `maxUses (${maxUses}) cannot be less than usedCount (${existing.usedCount})`,
        },
        { status: 400 },
      )
    }
    const updated = await prisma.inviteCode.update({
      where: { code },
      data: { maxUses },
      select: { code: true, maxUses: true, usedCount: true },
    })
    return NextResponse.json({
      action: "updated",
      invite: updated,
      unlimited: maxUses <= 0,
    })
  }

  const created = await prisma.inviteCode.create({
    data: {
      code,
      ownerId: admin.id,
      maxUses,
      usedCount: 0,
    },
    select: { code: true, maxUses: true, usedCount: true },
  })

  return NextResponse.json({
    action: "created",
    invite: created,
    unlimited: maxUses <= 0,
  })
}
