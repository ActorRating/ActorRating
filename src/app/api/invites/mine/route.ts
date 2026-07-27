export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { inviteRegisterUrl } from "@/lib/invites"

/** List the signed-in user's owned invite codes. */
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const invites = await prisma.inviteCode.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        code: true,
        usedAt: true,
        createdAt: true,
        usedBy: { select: { username: true } },
      },
    })

    return NextResponse.json({
      invites: invites.map((i) => ({
        id: i.id,
        code: i.code,
        used: Boolean(i.usedAt),
        usedAt: i.usedAt?.toISOString() ?? null,
        usedByUsername: i.usedBy?.username ?? null,
        shareUrl: inviteRegisterUrl(i.code),
        createdAt: i.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Invites list error:", error)
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 })
  }
}
