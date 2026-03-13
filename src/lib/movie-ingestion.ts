/**
 * Movie ingestion helpers: idempotent actor and performance sync for TMDB-sourced data.
 * Used by admin fetch, bulk fetch, and seed scripts.
 *
 * Architecture (≤2 min): We store the full TMDB cast so tiering and re-syncs are correct;
 * ingestion is idempotent (upsert by tmdbId / movieId+actorId) so re-runs are safe.
 *
 * --- Invariants (enforced by schema + this module) ---
 * • Every TMDB cast member → exactly one Actor. Uniqueness enforced by tmdbId (Actor.tmdbId @unique).
 *   When tmdbId is missing we fall back to name (Actor.name @unique).
 * • Every (movieId, actorId) for system ingestion → exactly one Performance.
 *   Uniqueness: @@unique([userId, actorId, movieId]) with fixed SYSTEM_USER_ID.
 * • Re-running ingestion: does not create duplicate Actors (findUnique then create; on unique
 *   constraint we re-fetch). Does not create duplicate Performances (upsert). Only updates
 *   order + tier when changed (upsert update sets them from current credits).
 *
 * --- Why we store full cast ---
 * We persist the full credited cast even if we don't surface everyone. So tiering and
 * re-syncs stay correct without re-fetching, and ensemble detection (castSize >= 20) is accurate.
 *
 * --- Why tiering exists ---
 * Tier (LEAD/SUPPORTING/MINOR) drives SEO, CTA eligibility, and indexing: which actors we
 * surface and make indexable. Ensemble films get wider LEAD/SUPPORTING ranges.
 *
 * --- Why ingestion must be idempotent ---
 * Pipeline is run repeatedly (bulk sync, backfills, admin fetch). Idempotency avoids
 * duplicate rows and allows safe re-runs after fixes or TMDB updates.
 */

import type { PrismaClient } from "@prisma/client";
import type { Actor, Performance } from "@prisma/client";
import { createActorSlug } from "@/lib/createSlug";
import { computePerformanceTier } from "@/lib/performance-tier";
import { getMovieCreditsForIngestion } from "@/lib/tmdb";
import type { MovieCreditsForIngestion } from "@/lib/tmdb";

/** User id used for system-ingested performances (admin/bulk/seed). One performance per (userId, actorId, movieId). */
export const SYSTEM_USER_ID = "uuid-from-auth-users";

export type EnsureActorResult = { actor: Actor; created: boolean };

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";

/**
 * Ensure an actor exists by TMDB id (idempotent). Look up by tmdbId first; if not found, create.
 * If TMDB id is missing, fall back to lookup/create by name.
 * Optional profilePath (TMDB profile_path) is stored as Actor.imageUrl when creating.
 * Guard: On unique constraint (e.g. Prisma P2002), re-fetch by tmdbId then by name so we never create duplicates.
 */
export async function ensureActorByTmdbId(
  prisma: PrismaClient,
  tmdbId: number | null,
  name: string,
  profilePath?: string | null
): Promise<EnsureActorResult> {
  const imageUrl =
    profilePath && profilePath.startsWith("/")
      ? `${TMDB_IMAGE_BASE}${profilePath}`
      : profilePath
        ? `${TMDB_IMAGE_BASE}/${profilePath}`
        : undefined;

  if (tmdbId != null) {
    const existing = await prisma.actor.findUnique({ where: { tmdbId } });
    if (existing) return { actor: existing, created: false };
    try {
      const actor = await prisma.actor.create({
        data: { name, tmdbId, slug: createActorSlug(name), ...(imageUrl && { imageUrl }) },
      });
      return { actor, created: true };
    } catch (e: unknown) {
      const byTmdb = await prisma.actor.findUnique({ where: { tmdbId } });
      if (byTmdb) return { actor: byTmdb, created: false };
      const byName = await prisma.actor.findUnique({ where: { name } });
      if (byName) return { actor: byName, created: false };
      throw e;
    }
  }
  const byName = await prisma.actor.findUnique({ where: { name } });
  if (byName) return { actor: byName, created: false };
  try {
    const actor = await prisma.actor.create({
      data: { name, slug: createActorSlug(name), ...(imageUrl && { imageUrl }) },
    });
    return { actor, created: true };
  } catch (e: unknown) {
    const again = await prisma.actor.findUnique({ where: { name } });
    if (again) return { actor: again, created: false };
    throw e;
  }
}

const PERFORMANCE_DEFAULTS = {
  emotionalRangeDepth: 0,
  characterBelievability: 0,
  technicalSkill: 0,
  screenPresence: 0,
  chemistryInteraction: 0,
} as const;

/**
 * Upsert one performance for (userId, movieId, actorId).
 * Uniqueness: one performance per (userId, actorId, movieId). Re-run only updates order + tier when changed.
 */
export async function upsertPerformanceForMovie(
  prisma: PrismaClient,
  userId: string,
  movieId: string,
  actorId: string,
  order: number,
  tier: "LEAD" | "SUPPORTING" | "MINOR",
  options?: { character?: string | null; comment?: string | null }
): Promise<Performance> {
  return prisma.performance.upsert({
    where: {
      userId_actorId_movieId: { userId, actorId, movieId },
    },
    update: {
      order,
      tier,
      ...(options?.character !== undefined && { character: options.character ?? null }),
      ...(options?.comment !== undefined && { comment: options.comment ?? null }),
    },
    create: {
      userId,
      movieId,
      actorId,
      order,
      tier,
      character: options?.character ?? null,
      comment: options?.comment ?? null,
      ...PERFORMANCE_DEFAULTS,
    },
  });
}

export type SyncMovieCastResult = {
  actorsCreated: number;
  performancesUpserted: number;
};

/**
 * Sync all cast for a movie: ensure actors (by tmdbId), then upsert performances with order and tier.
 * castSize = credits.cast.length; tier computed via computePerformanceTier(order, castSize).
 * Guard: Empty credits → log and skip (return 0,0). Nameless cast member → skip with comment.
 */
export async function syncMovieCast(
  prisma: PrismaClient,
  movieId: string,
  userId: string,
  credits: MovieCreditsForIngestion,
  options?: { director?: string; log?: (msg: string) => void }
): Promise<SyncMovieCastResult> {
  const log = options?.log ?? (() => {});
  const castSize = credits.cast.length;

  if (castSize === 0) {
    log("syncMovieCast: TMDB credits empty, skipping cast sync");
    return { actorsCreated: 0, performancesUpserted: 0 };
  }

  let actorsCreated = 0;
  let performancesUpserted = 0;

  for (let order = 0; order < credits.cast.length; order++) {
    const member = credits.cast[order];
    const name = member.name?.trim();
    if (!name) {
      log(`syncMovieCast: skipping cast member at order ${order} (no name)`);
      continue;
    }

    const { actor, created } = await ensureActorByTmdbId(
      prisma,
      member.id,
      member.name,
      member.profilePath ?? undefined
    );
    if (created) actorsCreated += 1;

    const tier = computePerformanceTier(order, castSize);
    const comment =
      options?.director != null
        ? `Character: ${member.character}, Director: ${options.director}`
        : undefined;
    await upsertPerformanceForMovie(prisma, userId, movieId, actor.id, order, tier, {
      character: member.character || null,
      comment: comment ?? null,
    });
    performancesUpserted += 1;
  }

  return { actorsCreated, performancesUpserted };
}

/** Simple tier for ingestion: LEAD 0–2, SUPPORTING 3–9, MINOR 10+. No ensemble adjustment. */
export function computeTierSimple(order: number): "LEAD" | "SUPPORTING" | "MINOR" {
  if (order <= 2) return "LEAD";
  if (order <= 9) return "SUPPORTING";
  return "MINOR";
}

export type IngestMovieCastResult = {
  actorsCreated: number;
  performancesCreated: number;
  performancesUpdated: number;
};

/**
 * Server-side ingestion: fetch the FULL credited cast for a movie from TMDB and create/update
 * performances. Idempotent; safe for single-movie or bulk sequential use.
 *
 * 1. Load Movie by internal id; throw if not found or tmdbId is null.
 * 2. Fetch full credits via getMovieCreditsForIngestion(movie.tmdbId) (rate-limited, no parallel).
 * 3. Iterate over FULL credits.cast — do NOT truncate. Array index = billing order.
 * 4. Skip only when: name is missing/empty, or tmdbId is null/undefined. Log skips if options.log provided.
 * 5. Actors: ensureActorByTmdbId (reuse or create with tmdbId, name, imageUrl from profile_path); re-fetch on unique conflict.
 * 6. Performances: unique per (userId=SYSTEM_USER_ID, actorId, movieId). Create or update only order, tier, character.
 * 7. Tier: computeTierSimple — LEAD 0–2, SUPPORTING 3–9, MINOR 10+ (no ensemble logic).
 *
 * Returns { actorsCreated, performancesCreated, performancesUpdated }. Never creates duplicate actors or performances.
 */
export async function ingestMovieCast(
  prisma: PrismaClient,
  movieId: string,
  options?: { log?: (msg: string) => void }
): Promise<IngestMovieCastResult> {
  const log = options?.log ?? (() => {});

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true, title: true, year: true, tmdbId: true, isFeaturette: true },
  });
  if (!movie) {
    throw new Error(`Movie not found: ${movieId}`);
  }
  if (movie.isFeaturette) {
    log(`Skipping featurette movie: ${movie.title}`);
    return { actorsCreated: 0, performancesCreated: 0, performancesUpdated: 0 };
  }
  if (movie.tmdbId == null) {
    throw new Error(`Movie "${movie.title}" (${movieId}) has no tmdbId; cannot fetch credits`);
  }

  const credits = await getMovieCreditsForIngestion(movie.tmdbId);
  const cast = credits.cast;

  const eligibleCast = cast
    .map((member, order) => ({ member, order }))
    .filter(
      ({ member }) => !!member.name?.trim() && member.id != null
    ) as { member: (typeof cast)[number]; order: number }[];

  if (eligibleCast.length === 0) {
    await prisma.movie.update({
      where: { id: movieId },
      data: { castIngestedAt: new Date() },
    });
    return { actorsCreated: 0, performancesCreated: 0, performancesUpdated: 0 };
  }

  const tmdbIds = eligibleCast.map(({ member }) => member.id!);
  const existingActors = await prisma.actor.findMany({
    where: { tmdbId: { in: tmdbIds } },
    select: { id: true, tmdbId: true },
  });
  const actorByTmdbId = new Map(existingActors.map((a) => [a.tmdbId!, a]));

  const existingPerformances = await prisma.performance.findMany({
    where: { movieId: movie.id, userId: SYSTEM_USER_ID },
    select: { id: true, actorId: true },
  });
  const performanceByActorId = new Map(existingPerformances.map((p) => [p.actorId, p]));

  let actorsCreated = 0;
  let performancesCreated = 0;
  let performancesUpdated = 0;

  for (const { member, order } of eligibleCast) {
    const name = member.name!.trim();
    let actor = actorByTmdbId.get(member.id!);
    if (!actor) {
      const result = await ensureActorByTmdbId(
        prisma,
        member.id!,
        name,
        member.profilePath ?? undefined
      );
      actor = result.actor;
      if (result.created) {
        actorsCreated += 1;
        actorByTmdbId.set(member.id!, actor);
      }
    }

    const tier = computeTierSimple(order);
    const characterName = member.character?.trim() || null;
    const existing = performanceByActorId.get(actor.id);

    if (!existing) {
      const created = await prisma.performance.create({
        data: {
          userId: SYSTEM_USER_ID,
          movieId: movie.id,
          actorId: actor.id,
          order,
          tier,
          character: characterName,
          comment: null,
          ...PERFORMANCE_DEFAULTS,
        },
      });
      performancesCreated += 1;
      performanceByActorId.set(actor.id, { id: created.id, actorId: created.actorId });
    } else {
      await prisma.performance.update({
        where: { id: existing.id },
        data: { order, tier, character: characterName },
      });
      performancesUpdated += 1;
    }
  }

  await prisma.movie.update({
    where: { id: movieId },
    data: { castIngestedAt: new Date() },
  });

  return { actorsCreated, performancesCreated, performancesUpdated };
}
