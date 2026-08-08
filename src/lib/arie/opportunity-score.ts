import type { OpportunityBreakdown, OpportunityResult } from "@/lib/arie/types"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"
import { isPriorityAuthor } from "@/lib/arie/priority-accounts"

/** Casting / role attachment — keep tight; bare "stars" alone is too noisy. */
const CASTING_RE =
  /\b(joins?|cast|casting|boards?|in talks|signs? on|tapped|reunite[sd]?|reuniting|set to (?:star|appear|return)|will (?:star|appear|return|play)|(?:being )?considered to (?:play|star|join|portray)|to play|auditioned for|rumou?red (?:to (?:play|join|star)|for)|plays? (?:the )?role|reprises?|officially cast|final (?:appearance|movie|film|time)|last dance|\d+-year run)\b/i
const CRAFT_RE =
  /\b(performance|acting|actor|actress|oscar|emmy|craft|role|character|scene[- ]stealing)\b/i

/**
 * Batch-1 ignore expansion (VM1 grading): wedding/relationship gossip was processing
 * on priority accounts because GOSSIP was narrow and off-brand only ignored under score 70.
 */
const GOSSIP_RE =
  /\b(dating|divorces?|split|pregnant|scandal|beef|feud|cancelled|wedding|weddings?|married|marriage|wife|husband|girlfriend|boyfriend|engaged|engagement|coffee date|wedding bands?)\b/i
const POLITICS_RE = /\b(election|president|congress|democrat|republican|gaza|ukraine war)\b/i
/** Promo / non-craft attachments that match entities but should not get ARIE replies. */
const PROMO_NOISE_RE =
  /\b(music video|billboard|installation|pop[- ]?up|brand activation|red carpet|fashion week|step(?:s|ped)? out for)\b/i
/** Fan pile-ons / aura dunking — Brand Constitution: no harassment engagement. */
const TOXIC_FAN_RE =
  /\b(clowning|lost all (?:his|her|their) aura|too feminine|too masculine|ratio(?:'d|ed)?)\b/i

const PROCESS_SCORE_MIN = 58

/**
 * Content Opportunity Score (RFC §11.1).
 * Runs before generation — most events should be ignored cheaply.
 *
 * Batch-1 change (ignore gate only): expand off-brand detection; always ignore
 * off-brand; remove priority-author score inflation when off-brand; raise soft floor.
 */
export function scoreOpportunity(input: {
  text: string
  authorHandle?: string | null
  entities: ExtractedEntities
  /** Minutes since event received; fresher = higher. */
  ageMinutes?: number
  /** Rough reply crowding 0–100 (higher = more competition). Unknown → 40. */
  competitionHint?: number
}): OpportunityResult {
  const priorityAuthor = isPriorityAuthor(input.authorHandle)
  const reasonCodes: string[] = []

  const gossip = GOSSIP_RE.test(input.text)
  const politics = POLITICS_RE.test(input.text)
  const promoNoise = PROMO_NOISE_RE.test(input.text)
  const toxicFan = TOXIC_FAN_RE.test(input.text)
  const offBrand = gossip || politics || promoNoise || toxicFan

  if (gossip) reasonCodes.push("off_brand_gossip")
  if (politics) reasonCodes.push("off_brand_politics")
  if (promoNoise) reasonCodes.push("off_brand_promo")
  if (toxicFan) reasonCodes.push("off_brand_toxic_fan")
  if (offBrand) reasonCodes.push("off_brand_topic")

  const casting = CASTING_RE.test(input.text)
  const craft = CRAFT_RE.test(input.text)

  // Relevance 0–100 — do not reward priority handles for off-brand topics
  let relevance = 35
  if (craft) relevance += 20
  if (casting) relevance += 25
  if (priorityAuthor && !offBrand) relevance += 15
  if (offBrand) relevance = Math.min(relevance, 22)
  relevance = clamp(relevance)

  // Virality proxy
  let virality = 25
  if (priorityAuthor && !offBrand) virality += 45
  else if (priorityAuthor && offBrand) virality += 10
  if (input.text.length > 80 && input.text.length < 400) virality += 10
  virality = clamp(virality)

  // ActorRating context — can we ground a reply?
  let arContext = 10
  if (input.entities.actors.length) arContext += 35
  if (input.entities.actors.length >= 2) arContext += 10
  if (input.entities.directors.length) arContext += 25
  if (input.entities.movies.length) arContext += 20
  if (
    input.entities.actors.length === 0 &&
    input.entities.directors.length === 0 &&
    input.entities.movies.length === 0
  ) {
    arContext = 5
    reasonCodes.push("weak_ar_context")
  }
  arContext = clamp(arContext)

  const uniqueness = 70

  const crowding = input.competitionHint ?? (priorityAuthor ? 55 : 35)
  const competition = clamp(100 - crowding)

  const age = input.ageMinutes ?? 5
  let freshness = 95
  if (age > 30) freshness = 75
  if (age > 120) freshness = 50
  if (age > 720) freshness = 25
  freshness = clamp(freshness)

  const breakdown: OpportunityBreakdown = {
    relevance,
    virality,
    arContext,
    uniqueness,
    competition,
    freshness,
  }

  const score = Math.round(
    0.3 * relevance +
      0.2 * virality +
      0.2 * arContext +
      0.15 * uniqueness +
      0.1 * competition +
      0.05 * freshness,
  )

  let decision: OpportunityResult["decision"] = score >= PROCESS_SCORE_MIN ? "process" : "ignore"
  let suggestedFormat: OpportunityResult["suggestedFormat"] = "ignore"

  // Hard ignore — Batch-1: never draft off-brand even on BoinkBuzz/ChaosCrave
  if (offBrand) {
    decision = "ignore"
    suggestedFormat = "ignore"
    reasonCodes.push("ignored_off_brand")
  } else if (decision === "process") {
    // Prefer craft/casting signal; pure celebrity name-drop with entities still allowed if score clears floor
    suggestedFormat = "reply"
    if (!casting && !craft && score < 68) {
      decision = "ignore"
      suggestedFormat = "ignore"
      reasonCodes.push("ignored_no_craft_signal")
    } else {
      reasonCodes.push("process_candidate")
    }
  }

  if (decision === "ignore" && !reasonCodes.includes("ignored_off_brand") && !reasonCodes.includes("ignored_no_craft_signal")) {
    reasonCodes.push("below_threshold")
  }

  return {
    score,
    breakdown,
    decision,
    suggestedFormat,
    reasonCodes,
    priorityAuthor,
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}
