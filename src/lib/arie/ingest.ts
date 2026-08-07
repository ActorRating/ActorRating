import type { AriePlatform, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { arieIngestEnabled } from "@/lib/arie/config"
import { arieLog } from "@/lib/arie/log"

export type IngestEventInput = {
  platform?: AriePlatform
  externalId: string
  authorHandle?: string | null
  authorId?: string | null
  text: string
  payload?: Record<string, unknown>
}

/**
 * Idempotent ingest of an inbound platform event (Sprint 1).
 * Opportunity scoring lands in Sprint 2 — events stay PENDING until then.
 */
export async function ingestInboundEvent(input: IngestEventInput) {
  if (!arieIngestEnabled()) {
    await arieLog("warn", "ingest", "ingest_disabled", { externalId: input.externalId })
    return { ok: false as const, reason: "ingest_disabled" }
  }

  const platform = input.platform ?? "X"
  const externalId = input.externalId.trim()
  if (!externalId) {
    return { ok: false as const, reason: "externalId_required" }
  }
  const text = input.text?.trim() ?? ""
  if (!text) {
    return { ok: false as const, reason: "text_required" }
  }

  try {
    const existing = await prisma.arieInboundEvent.findUnique({
      where: { platform_externalId: { platform, externalId } },
    })
    if (existing) {
      await arieLog("info", "ingest", "event_deduped", {
        id: existing.id,
        platform,
        externalId,
      })
      return { ok: true as const, event: existing, deduped: true }
    }

    const event = await prisma.arieInboundEvent.create({
      data: {
        platform,
        externalId,
        authorHandle: input.authorHandle ?? null,
        authorId: input.authorId ?? null,
        text,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        decision: "PENDING",
      },
    })

    await arieLog("info", "ingest", "event_created", {
      id: event.id,
      platform,
      externalId,
    })

    return { ok: true as const, event, deduped: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await arieLog("error", "ingest", "ingest_failed", { externalId, error: msg })
    return { ok: false as const, reason: msg }
  }
}
