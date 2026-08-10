import { z } from "zod"
import {
  ORIGINAL_FORMATS,
  conceptsAreDistinct,
  type OriginalConcept,
} from "@/lib/arie/original-types"

export const originalFormatSchema = z.enum(ORIGINAL_FORMATS)

export const originalConceptSchema = z.object({
  id: z.string().min(1).optional(),
  format: originalFormatSchema,
  hook: z.string().min(1).max(280),
  angle: z.string().min(1).max(600),
  actorRatingAdvantage: z.string().min(1).max(600),
  discussionQuestion: z.string().min(1).max(280),
  dataUsed: z.array(z.string()).default([]),
  visualPotential: z.string().default(""),
  estimatedStrength: z.number().min(0).max(100).default(50),
  riskFlags: z.array(z.string()).default([]),
})

export const originalConceptsResponseSchema = z.object({
  concepts: z.array(originalConceptSchema).min(1).max(3),
})

export const originalDraftResponseSchema = z.object({
  text: z.string().min(1).max(500),
  confidence: z.number().min(0).max(100).optional(),
  claims: z.array(z.string()).optional(),
  entities: z
    .array(
      z.object({
        type: z.string(),
        id: z.string().optional(),
        name: z.string(),
      }),
    )
    .optional(),
})

export const visualSpecSchema = z.object({
  type: z.enum([
    "radar_comparison",
    "actor_comparison",
    "ranked_list",
    "performance_comparison",
    "filmography_timeline",
    "score_card",
    "movie_actor_matchup",
    "none",
  ]),
  title: z.string(),
  subjects: z.array(z.string()),
  dimensions: z.array(z.string()).optional(),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.union([z.number(), z.string(), z.null()]),
      factIds: z.array(z.string()).optional(),
      source: z.literal("actorrating_db").optional(),
    }),
  ),
  layout: z.string(),
  caption: z.string(),
  assetRequirements: z.array(z.string()),
  eligible: z.boolean(),
  reason: z.string().optional(),
})

export const semanticQaResponseSchema = z.object({
  passed: z.boolean(),
  confidence: z.number().min(0).max(100).optional(),
  scores: z
    .object({
      factualAccuracy: z.number().min(1).max(5),
      relevance: z.number().min(1).max(5),
      originality: z.number().min(1).max(5),
      insight: z.number().min(1).max(5),
      brandVoice: z.number().min(1).max(5),
      discussionQuality: z.number().min(1).max(5),
      actorRatingAdvantage: z.number().min(1).max(5),
      hallucinationRisk: z.number().min(1).max(5),
    })
    .partial()
    .optional(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  summary: z.string().optional(),
})

export function parseConceptsWithZod(
  raw: unknown,
): { ok: true; concepts: OriginalConcept[] } | { ok: false; reason: string } {
  const parsed = originalConceptsResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, reason: `zod_concepts:${parsed.error.issues[0]?.message ?? "invalid"}` }
  }
  const concepts: OriginalConcept[] = parsed.data.concepts.map((c, i) => ({
    id: c.id || `c${i + 1}`,
    format: c.format,
    hook: c.hook.trim(),
    angle: c.angle.trim(),
    actorRatingAdvantage: c.actorRatingAdvantage.trim(),
    discussionQuestion: c.discussionQuestion.trim(),
    dataUsed: c.dataUsed,
    visualPotential: c.visualPotential,
    estimatedStrength: Math.round(c.estimatedStrength),
    riskFlags: c.riskFlags,
  }))
  const distinct = conceptsAreDistinct(concepts)
  if (!distinct.ok) {
    // Still return concepts but mark — caller may soft-flag
    return { ok: true, concepts }
  }
  return { ok: true, concepts }
}

export function parseDraftWithZod(
  raw: unknown,
): { ok: true; data: z.infer<typeof originalDraftResponseSchema> } | { ok: false; reason: string } {
  const parsed = originalDraftResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, reason: `zod_draft:${parsed.error.issues[0]?.message ?? "invalid"}` }
  }
  return { ok: true, data: parsed.data }
}

export function parseSemanticQaWithZod(
  raw: unknown,
): { ok: true; data: z.infer<typeof semanticQaResponseSchema> } | { ok: false; reason: string } {
  const parsed = semanticQaResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, reason: `zod_qa:${parsed.error.issues[0]?.message ?? "invalid"}` }
  }
  return { ok: true, data: parsed.data }
}
