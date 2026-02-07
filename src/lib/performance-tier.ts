import { PerformanceTier } from "@prisma/client";

/**
 * Performance tier (LEAD / SUPPORTING / MINOR) is used to decide which actors
 * are surfaced, indexable, and eligible for CTAs. Ensemble handling exists
 * because large-cast films (e.g. Avengers, Dune) would otherwise classify
 * most of the cast as MINOR; we widen LEAD/SUPPORTING ranges for those
 * films so more actors are eligible.
 */

/**
 * Ensemble threshold: movies with at least this many credited cast members
 * are treated as ensemble films and get wider LEAD/SUPPORTING ranges.
 */
const ENSEMBLE_CAST_SIZE_THRESHOLD = 20;

/** Non-ensemble: last billing index (0-based) for LEAD. */
const NON_ENSEMBLE_LEAD_MAX_ORDER = 2;
/** Non-ensemble: last billing index for SUPPORTING (above this = MINOR). */
const NON_ENSEMBLE_SUPPORTING_MAX_ORDER = 8;

/** Ensemble: last billing index for LEAD. */
const ENSEMBLE_LEAD_MAX_ORDER = 5;
/** Ensemble: last billing index for SUPPORTING. */
const ENSEMBLE_SUPPORTING_MAX_ORDER = 15;

/**
 * Computes the performance tier from billing order and cast size.
 *
 * Ensemble handling: large casts (e.g. Avengers, Dune) get more LEAD/SUPPORTING
 * slots so we surface and index more actors instead of treating them as MINOR.
 *
 * Rules:
 * - Ensemble (castSize >= 20):
 *   - LEAD       → order 0–5
 *   - SUPPORTING → order 6–15
 *   - MINOR      → order > 15
 * - Non-ensemble:
 *   - LEAD       → order 0–2
 *   - SUPPORTING → order 3–8
 *   - MINOR      → order > 8
 */
export function computePerformanceTier(
  order: number,
  castSize: number
): PerformanceTier {
  const isEnsemble = castSize >= ENSEMBLE_CAST_SIZE_THRESHOLD;

  if (isEnsemble) {
    if (order <= ENSEMBLE_LEAD_MAX_ORDER) return "LEAD";
    if (order <= ENSEMBLE_SUPPORTING_MAX_ORDER) return "SUPPORTING";
    return "MINOR";
  }

  if (order <= NON_ENSEMBLE_LEAD_MAX_ORDER) return "LEAD";
  if (order <= NON_ENSEMBLE_SUPPORTING_MAX_ORDER) return "SUPPORTING";
  return "MINOR";
}

export type { PerformanceTier };
