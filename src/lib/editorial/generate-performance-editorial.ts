import type { EditorialStatus, PrismaClient } from "@prisma/client"
import {
  buildPerformanceFactsPack,
  hashPerformanceFacts,
} from "@/lib/editorial/performance-facts"
import { TEMPLATE_VERSION } from "@/lib/editorial/editorial-version"
import { buildTemplateEditorial } from "@/lib/editorial/performance-editorial-template"
import { validateEditorialDraft } from "@/lib/editorial/performance-editorial-validate"

const GENERATOR_ID = "template-v1"

export type GenerateEditorialResult =
  | { ok: true; id: string; status: EditorialStatus; wordCount: number; regenerated: boolean }
  | { ok: false; reason: string }

/**
 * Generate (or regenerate) a performance editorial from facts + deterministic templates.
 * Never overwrites HUMAN_LOCKED rows unless force=true.
 * On success, status becomes PUBLISHED (auto-publish for indexable rollout).
 */
export async function generatePerformanceEditorial(
  prisma: PrismaClient,
  actorId: string,
  movieId: string,
  opts: { force?: boolean; publish?: boolean; editedByEmail?: string | null } = {},
): Promise<GenerateEditorialResult> {
  const existing = await prisma.performanceEditorial.findUnique({
    where: { actorId_movieId: { actorId, movieId } },
  })

  if (existing?.status === "HUMAN_LOCKED" && !opts.force) {
    return { ok: false, reason: "HUMAN_LOCKED — skip (use force to overwrite)" }
  }

  const facts = await buildPerformanceFactsPack(prisma, actorId, movieId)
  if (!facts) {
    return { ok: false, reason: "Not indexable or missing performance" }
  }

  const inputHash = hashPerformanceFacts(facts, TEMPLATE_VERSION)
  const draft = buildTemplateEditorial(facts)
  const validation = validateEditorialDraft(draft)
  if (!validation.ok) {
    return { ok: false, reason: validation.reason }
  }

  const publish = opts.publish !== false
  const now = new Date()
  const wc = validation.wordCount
  const status: EditorialStatus =
    existing?.status === "HUMAN_LOCKED" && opts.force
      ? "HUMAN_LOCKED"
      : publish
        ? "PUBLISHED"
        : "DRAFT"

  const row = await prisma.performanceEditorial.upsert({
    where: { actorId_movieId: { actorId, movieId } },
    create: {
      actorId,
      movieId,
      status,
      overview: draft.overview,
      scoreAnalysis: draft.scoreAnalysis,
      communityTake: draft.communityTake,
      notableMoments: draft.notableMoments,
      spoilerFree: true,
      wordCount: wc,
      inputHash,
      promptVersion: TEMPLATE_VERSION,
      model: GENERATOR_ID,
      generatedAt: now,
      publishedAt: status === "PUBLISHED" || status === "HUMAN_LOCKED" ? now : null,
      editedByEmail: opts.editedByEmail ?? null,
      editedAt: opts.editedByEmail ? now : null,
    },
    update: {
      status,
      overview: draft.overview,
      scoreAnalysis: draft.scoreAnalysis,
      communityTake: draft.communityTake,
      notableMoments: draft.notableMoments,
      spoilerFree: true,
      wordCount: wc,
      inputHash,
      promptVersion: TEMPLATE_VERSION,
      model: GENERATOR_ID,
      generatedAt: now,
      publishedAt:
        status === "PUBLISHED" || status === "HUMAN_LOCKED"
          ? existing?.publishedAt ?? now
          : null,
      editedByEmail: opts.editedByEmail ?? existing?.editedByEmail ?? null,
      editedAt: opts.editedByEmail ? now : existing?.editedAt ?? null,
    },
  })

  return {
    ok: true,
    id: row.id,
    status: row.status,
    wordCount: wc,
    regenerated: !!existing,
  }
}

/**
 * Mark stale published/draft editorials as NEEDS_REGEN when facts hash drifts.
 * Skips HUMAN_LOCKED.
 */
export async function markStaleEditorialsNeedingRegen(
  prisma: PrismaClient,
  limit = 100,
): Promise<number> {
  const rows = await prisma.performanceEditorial.findMany({
    where: { status: { in: ["PUBLISHED", "DRAFT", "NEEDS_REGEN"] } },
    take: limit,
    orderBy: { updatedAt: "asc" },
    select: { id: true, actorId: true, movieId: true, inputHash: true, status: true },
  })

  let marked = 0
  for (const row of rows) {
    const facts = await buildPerformanceFactsPack(prisma, row.actorId, row.movieId)
    if (!facts) continue
    const hash = hashPerformanceFacts(facts, TEMPLATE_VERSION)
    if (hash !== row.inputHash && row.status !== "NEEDS_REGEN") {
      await prisma.performanceEditorial.update({
        where: { id: row.id },
        data: { status: "NEEDS_REGEN" },
      })
      marked += 1
    }
  }
  return marked
}
