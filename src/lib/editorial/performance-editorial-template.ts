import type { PerformanceFactsPack } from "@/lib/editorial/performance-facts"
import type { EditorialDraftSections } from "@/lib/editorial/performance-editorial-prompt"
import { TEMPLATE_VERSION } from "@/lib/editorial/editorial-version"

export { TEMPLATE_VERSION }

const DIM_LABELS: Record<string, string> = {
  emotionalRangeDepth: "Emotional Range & Depth",
  characterBelievability: "Character Believability",
  technicalSkill: "Technical Skill",
  screenPresence: "Screen Presence",
  chemistryInteraction: "Chemistry & Interaction",
}

function rolePhrase(facts: PerformanceFactsPack): string {
  const character = facts.character?.trim()
  if (character && character.toLowerCase() !== "unknown") {
    return `as ${character}`
  }
  if (facts.tier === "LEAD") return "in a lead turn"
  if (facts.tier === "SUPPORTING") return "in a supporting turn"
  return "in this role"
}

function genrePhrase(facts: PerformanceFactsPack): string {
  if (facts.genres.length === 0) return "the film"
  if (facts.genres.length === 1) return `this ${facts.genres[0]} film`
  return `this ${facts.genres.slice(0, 2).join("/")} film`
}

function directorPhrase(facts: PerformanceFactsPack): string {
  const d = facts.director?.trim()
  if (!d || d.toLowerCase() === "unknown") return ""
  return ` under ${d}`
}

function scoreBand(avg10: number | null): "high" | "mid" | "low" | "none" {
  if (avg10 == null) return "none"
  if (avg10 >= 8) return "high"
  if (avg10 >= 6) return "mid"
  return "low"
}

function listJoin(items: string[]): string {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}

function dimLine(facts: PerformanceFactsPack): string {
  const parts: string[] = []
  for (const [key, label] of Object.entries(DIM_LABELS)) {
    const v = facts.dimensions[key]
    if (v != null) parts.push(`${label} ${v.toFixed(1)}`)
  }
  return parts.length ? parts.join("; ") : "dimension averages are still forming"
}

function relatedLine(facts: PerformanceFactsPack): string {
  const labels = facts.relatedPerformanceLabels.slice(0, 3)
  if (labels.length === 0) {
    return "Related craft readings on ActorRating point to other performances with similar strength profiles."
  }
  return `Nearby craft comparisons on ActorRating include ${listJoin(labels)}.`
}

/**
 * Deterministic, spoiler-safe editorial draft from community score facts (no LLM).
 */
export function buildTemplateEditorial(facts: PerformanceFactsPack): EditorialDraftSections {
  const role = rolePhrase(facts)
  const genre = genrePhrase(facts)
  const director = directorPhrase(facts)
  const band = scoreBand(facts.avg10)
  const strong = listJoin(facts.strongestDimensions)
  const weak = listJoin(facts.weakestDimensions)
  const avg = facts.avg10 != null ? facts.avg10.toFixed(1) : null
  const n = facts.ratingCount

  const overviewParts = [
    `${facts.actorName} ${role} in ${facts.movieTitle} (${facts.movieYear})${director} gives raters a clear craft target inside ${genre}.`,
    band === "high" && avg
      ? `Community scores currently sit near ${avg}/10, which places the work among stronger rated turns for presence, conviction, and moment-to-moment control.`
      : band === "mid" && avg
        ? `Community scores currently sit around ${avg}/10 — solid craft with room for debate on which dimensions carry the performance.`
        : band === "low" && avg
          ? `Community scores currently sit near ${avg}/10, so discussion tends to focus on which craft choices land and which feel uneven.`
          : `Community ratings are still gathering for this pairing, so early impressions matter more than a settled score.`,
    `On ActorRating, this page is about the acting — not a verdict on the movie as a whole.`,
  ]

  const scoreAnalysisParts = [
    strong
      ? `The radar lean is clearest in ${strong}, where raters tend to reward the performance most consistently.`
      : `The five-criteria radar is still light on data, so no single dimension dominates yet.`,
    weak && weak !== strong
      ? `Relative soft spots show up around ${weak}, which is where disagreement often concentrates.`
      : `As more detailed ratings arrive, weakest and strongest axes will separate more clearly.`,
    `Breakdown: ${dimLine(facts)}. Use those axes to decide whether the work impresses you for emotional range, believability, technique, screen presence, or chemistry.`,
  ]

  const communityTakeParts = [
    n >= 50
      ? `With ${n} community ratings, the consensus here is relatively thick for ActorRating — enough volume to treat the aggregate as a meaningful signal rather than a handful of hot takes.`
      : n >= 10
        ? `With ${n} community ratings, the consensus is starting to stabilize, though a few more detailed scores could still shift dimension averages.`
        : n >= 1
          ? `Only ${n} community rating${n === 1 ? " has" : "s have"} landed so far, so treat the average as an early read rather than a locked verdict.`
          : `No signed community ratings are recorded yet — seed context may exist for browsing, but consensus copy should stay cautious until people rate.`,
    avg
      ? `The headline community average is ${avg}/10 across Emotional Range & Depth, Character Believability, Technical Skill, Screen Presence, and Chemistry & Interaction.`
      : `Once ratings arrive, the headline average will summarize those five craft criteria on a 0–10 scale.`,
    `If your rating diverges from the pack, the dimension sliders are the best way to show where you part company.`,
  ]

  const notableMomentsParts = [
    `Without spoiling story turns, watch for craft tells: how ${facts.actorName} uses stillness versus push, how dialogue lands under pressure, and whether the character feels inhabited even in quiet beats.`,
    strong
      ? `Given the current radar emphasis on ${strong}, prioritize scenes (or stretches of scenes) where that quality is most exposed — not plot shock, but delivery, physical choice, and listening.`
      : `Prioritize stretches where the actor must hold attention without spectacle: reaction shots, held silence, and exchanges that depend on chemistry rather than exposition.`,
    relatedLine(facts),
  ]

  return {
    overview: overviewParts.filter(Boolean).join(" "),
    scoreAnalysis: scoreAnalysisParts.filter(Boolean).join(" "),
    communityTake: communityTakeParts.filter(Boolean).join(" "),
    notableMoments: notableMomentsParts.filter(Boolean).join(" "),
  }
}
