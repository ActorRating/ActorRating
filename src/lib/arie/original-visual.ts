import type { ContextPackage } from "@/lib/arie/types"
import type { OriginalConcept, VisualSpec } from "@/lib/arie/original-types"

/**
 * Build a structured visual specification from Context Package truth only.
 * Does not invent scores. Actual image rendering is out of scope (Sprint 5).
 */
export function buildVisualSpec(input: {
  concept: OriginalConcept
  package: ContextPackage
}): VisualSpec {
  const pkg = input.package
  const concept = input.concept
  const numericFacts = pkg.facts.filter((f) => typeof f.value === "number")

  if (concept.format === "RADAR_VISUAL" || /radar/i.test(concept.visualPotential)) {
    if (
      pkg.radar &&
      Object.values(pkg.radar.dimensions).some((v) => typeof v === "number")
    ) {
      const dims = Object.entries(pkg.radar.dimensions)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => ({
          label: k,
          value: v as number,
          source: "actorrating_db" as const,
        }))
      return {
        type: "radar_comparison",
        title: `${pkg.radar.actorName} — ${pkg.radar.movieTitle}`,
        subjects: [pkg.radar.actorName],
        dimensions: dims.map((d) => d.label),
        data: dims,
        layout: "radar",
        caption: "ActorRating radar dimensions (verified).",
        assetRequirements: ["radar_chart_template"],
        eligible: dims.length >= 3,
        reason: dims.length >= 3 ? undefined : "missing_numeric_data",
      }
    }
    return ineligibleNumeric("radar_comparison", "Radar visual requested but required numeric radar dims missing.")
  }

  if (
    concept.format === "RANKING" ||
    concept.format === "COMPARISON" ||
    /rank|comparison|vs/i.test(concept.visualPotential)
  ) {
    const perfs = pkg.topPerformances
      .filter((p) => typeof p.seededAggregate === "number")
      .slice(0, 5)
    if (perfs.length >= 2) {
      return {
        type: concept.format === "COMPARISON" ? "actor_comparison" : "ranked_list",
        title:
          concept.format === "COMPARISON"
            ? "ActorRating comparison"
            : "ActorRating performance ranking",
        subjects: perfs.map((p) => `${p.actorName} — ${p.movieTitle}`),
        data: perfs.map((p) => ({
          label: `${p.actorName} in ${p.movieTitle} (${p.movieYear})`,
          value: p.seededAggregate,
          source: "actorrating_db" as const,
        })),
        layout: "vertical_bars",
        caption: "Scores from ActorRating (community/seeded aggregates).",
        assetRequirements: ["ranking_card"],
        eligible: true,
      }
    }

    const related = pkg.relatedPerformances.slice(0, 4)
    if (related.length >= 2) {
      // Entity relationships exist but numeric comparison cannot be computed.
      return {
        type: "performance_comparison",
        title: "Related performances",
        subjects: related.map((r) => `${r.actorName} — ${r.movieTitle}`),
        data: related.map((r) => ({
          label: `${r.actorName} in ${r.movieTitle} (${r.movieYear})`,
          value: null,
          source: "actorrating_db" as const,
        })),
        layout: "list",
        caption:
          "Related performances from ActorRating graph (scores unavailable — not eligible as numeric comparison).",
        assetRequirements: ["comparison_card"],
        eligible: false,
        reason: "missing_numeric_data",
      }
    }

    return ineligibleNumeric(
      concept.format === "COMPARISON" ? "actor_comparison" : "ranked_list",
      "Comparison/ranking visual requires at least two numeric performance scores.",
    )
  }

  if (pkg.communityRating && typeof pkg.communityRating.avg10 === "number") {
    return {
      type: "score_card",
      title: pkg.movie?.title
        ? `${pkg.actor?.name ?? "Performance"} — ${pkg.movie.title}`
        : "ActorRating score card",
      subjects: [pkg.actor?.name, pkg.movie?.title].filter(Boolean) as string[],
      data: [
        {
          label: "community_avg_10",
          value: pkg.communityRating.avg10,
          source: "actorrating_db",
        },
        {
          label: "rating_count",
          value: pkg.communityRating.ratingCount,
          source: "actorrating_db",
        },
      ],
      layout: "score_card",
      caption: "Community rating on ActorRating.",
      assetRequirements: ["score_card"],
      eligible: true,
    }
  }

  if (numericFacts.length > 0) {
    return {
      type: "score_card",
      title: concept.hook.slice(0, 80),
      subjects: pkg.actors.map((a) => a.name).slice(0, 3),
      data: numericFacts.slice(0, 6).map((f) => ({
        label: f.text.slice(0, 80),
        value: f.value as number,
        factIds: [f.fact_id],
        source: "actorrating_db" as const,
      })),
      layout: "facts",
      caption: "Verified ActorRating facts only.",
      assetRequirements: [],
      eligible: true,
    }
  }

  return {
    type: "none",
    title: "",
    subjects: [],
    data: [],
    layout: "none",
    caption: "",
    assetRequirements: [],
    eligible: false,
    reason: "no_verified_visual_data",
  }
}

function ineligibleNumeric(
  type: VisualSpec["type"],
  caption: string,
): VisualSpec {
  return {
    type,
    title: "",
    subjects: [],
    data: [],
    layout: "none",
    caption,
    assetRequirements: [],
    eligible: false,
    reason: "missing_numeric_data",
  }
}
