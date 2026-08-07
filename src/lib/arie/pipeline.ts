import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { buildContextPackage } from "@/lib/arie/context-builder"
import { extractEntitiesFromText } from "@/lib/arie/entity-extract"
import { arieLog } from "@/lib/arie/log"
import { scoreOpportunity } from "@/lib/arie/opportunity-score"
import type { ContextPackage } from "@/lib/arie/types"
import { CONTEXT_BUILDER_VERSION } from "@/lib/arie/types"

/**
 * Full Sprint 2 pipeline (deterministic; LLM does not choose fetches):
 * text → entity extraction → Opportunity Score → Context Builder → persist
 */
export async function processInboundEvent(eventId: string): Promise<{
  ok: boolean
  reason?: string
  opportunityId?: string
  packageId?: string
  opportunityScore?: number
  decision?: string
  context?: ContextPackage
}> {
  const event = await prisma.arieInboundEvent.findUnique({ where: { id: eventId } })
  if (!event) return { ok: false, reason: "event_not_found" }

  const ageMinutes = Math.max(
    0,
    (Date.now() - event.receivedAt.getTime()) / 60_000,
  )

  try {
    const entities = await extractEntitiesFromText(prisma, event.text)
    const opportunity = scoreOpportunity({
      text: event.text,
      authorHandle: event.authorHandle,
      entities,
      ageMinutes,
    })

    const context = await buildContextPackage(prisma, {
      text: event.text,
      authorHandle: event.authorHandle,
      authorId: event.authorId,
      externalId: event.externalId,
      ageMinutes,
      entities,
      opportunity,
    })

    const decision = opportunity.decision === "process" ? "PROCESS" : "IGNORE"

    await prisma.arieInboundEvent.update({
      where: { id: event.id },
      data: {
        decision,
        opportunityScore: opportunity.score,
        scoreBreakdown: opportunity.breakdown as unknown as Prisma.InputJsonValue,
        reasonCodes: opportunity.reasonCodes,
        processedAt: new Date(),
        errorMessage: null,
      },
    })

    const opp = await prisma.arieOpportunity.create({
      data: {
        inboundEventId: event.id,
        format: opportunity.suggestedFormat,
        status: opportunity.decision === "process" ? "open" : "ignored",
        opportunityScore: opportunity.score,
        scoreBreakdown: opportunity.breakdown as unknown as Prisma.InputJsonValue,
        priorityAuthor: opportunity.priorityAuthor,
      },
    })

    const saved = await prisma.arieContextPackage.create({
      data: {
        opportunityId: opp.id,
        inboundEventId: event.id,
        package: context as unknown as Prisma.InputJsonValue,
        builderVersion: CONTEXT_BUILDER_VERSION,
      },
    })

    await arieLog("info", "pipeline", "event_processed", {
      eventId: event.id,
      opportunityId: opp.id,
      score: opportunity.score,
      decision,
      packageId: context.package_id,
    })

    return {
      ok: true,
      opportunityId: opp.id,
      packageId: saved.id,
      opportunityScore: opportunity.score,
      decision,
      context,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await prisma.arieInboundEvent.update({
      where: { id: event.id },
      data: {
        decision: "ERROR",
        errorMessage: msg.slice(0, 500),
        processedAt: new Date(),
      },
    })
    await arieLog("error", "pipeline", "process_failed", { eventId, error: msg })
    return { ok: false, reason: msg }
  }
}

/** Build a Context Package from free text (admin / n8n) without an inbound row. */
export async function buildContextFromText(input: {
  text: string
  authorHandle?: string | null
}): Promise<ContextPackage> {
  return buildContextPackage(prisma, {
    text: input.text,
    authorHandle: input.authorHandle,
  })
}
