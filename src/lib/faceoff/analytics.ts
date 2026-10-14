import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { hashIp } from "@/lib/analytics/ip-hash"

type FaceOffEventName =
  | "faceoff_vote_accepted"
  | "faceoff_vote_rejected"
  | "faceoff_five_choices_completed"

export async function recordFaceOffServerEvent(input: {
  name: FaceOffEventName
  auth: "guest" | "authenticated"
  mode?: string | null
  choiceNumber?: number
  reason?: string
  ip?: string | null
  userAgent?: string | null
  userId?: string | null
  source?: string | null
  campaign?: string | null
}): Promise<void> {
  try {
    const properties: Prisma.InputJsonValue = {
      auth: input.auth,
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.choiceNumber != null ? { choice_number: input.choiceNumber } : {}),
      ...(input.reason ? { reason: input.reason.slice(0, 180) } : {}),
      ...(input.campaign ? { campaign: input.campaign.slice(0, 200) } : {}),
    }
    await prisma.productEvent.create({
      data: {
        name: input.name,
        path: "/faceoff",
        source: input.source?.slice(0, 50) ?? null,
        properties,
        userId: input.userId ?? null,
        ipHash: hashIp(input.ip || "unknown"),
        userAgent: (input.userAgent || "").slice(0, 1000),
        isLikelyBot: false,
      },
    })
  } catch {
    /* Analytics must not block a confirmed vote. */
  }
}
