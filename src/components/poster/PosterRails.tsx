"use client";

/**
 * Shared Letterboxd-style poster rails used on landing + /discover.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EnrichedPerformance } from "@/lib/performances-by-lookup";
import type { PerformanceTarget } from "@/lib/performances-page-targets";
import { upgradeActorImageRes } from "@/lib/tmdb";
import { getActorUrl, getMovieUrl } from "@/lib/slugHelper";
import { createMovieSlug } from "@/lib/createSlug";

export type RailActor = {
  id: string;
  name: string;
  imageUrl?: string | null;
  slug?: string | null;
};

const SANS: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans), var(--font-sans), system-ui, sans-serif",
};

const POSTER_TILE =
  "group flex-shrink-0 w-[86px] sm:w-[92px] md:w-[100px] lg:w-[110px] block";

export function upgradePosterThumbRes(url?: string | null): string | null {
  if (!url) return null;
  return url
    .replace("/t/p/w92/", "/t/p/w342/")
    .replace("/t/p/w185/", "/t/p/w342/");
}

export function tmdbPoster(path?: string): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w342${path}`;
}

function performanceKey(p: EnrichedPerformance): string | null {
  if (!p.actor?.name || !p.movie?.title) return null;
  return `${p.actor.name}:${p.movie.title}`;
}

function characterFallback(
  actor: string,
  movie: string,
  targets: PerformanceTarget[],
): string | null {
  return (
    targets.find((t) => t.actor === actor && t.movie === movie)?.character ??
    null
  );
}

function movieHrefFromStatic(item: PerformanceTarget): string {
  return getMovieUrl({
    id: createMovieSlug(item.movie, item.year),
    title: item.movie,
    year: item.year ?? 0,
    slug: createMovieSlug(item.movie, item.year),
  });
}

/** Clean Letterboxd-style poster — art first; actor / character / movie on hover */
export function CleanPosterLink({
  href,
  poster,
  face,
  actorName,
  characterName,
  movieTitle,
  priority,
  onPrefetch,
}: {
  href: string;
  poster: string | null;
  face?: string | null;
  actorName: string;
  characterName?: string | null;
  movieTitle: string;
  priority?: boolean;
  onPrefetch?: () => void;
}) {
  const a11yLabel = characterName
    ? `${actorName} as ${characterName} — ${movieTitle}`
    : `${actorName} — ${movieTitle}`;

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={onPrefetch}
      className={POSTER_TILE}
      title={a11yLabel}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#141414] ring-1 ring-white/[0.08]">
        {poster ? (
          <Image
            src={poster}
            alt={a11yLabel}
            fill
            className="object-cover"
            sizes="140px"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        ) : face ? (
          <Image
            src={face}
            alt={a11yLabel}
            fill
            className="object-cover"
            sizes="140px"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900 flex items-end p-2">
            <span className="text-[10px] text-zinc-500 line-clamp-3">
              {a11yLabel}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <p className="text-[11px] font-semibold text-white leading-tight line-clamp-1">
            {actorName}
          </p>
          {characterName ? (
            <p className="text-[10px] text-zinc-300 leading-tight line-clamp-1 mt-0.5">
              as {characterName}
            </p>
          ) : null}
          <p className="text-[10px] text-zinc-400 leading-tight line-clamp-1 mt-0.5">
            {movieTitle}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function RailTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-3 sm:mb-3.5">
      <h2
        className="text-lg sm:text-xl font-semibold text-white tracking-tight"
        style={SANS}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="text-xs sm:text-sm text-zinc-500 mt-1" style={SANS}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function StaticPosterRail({
  title,
  subtitle,
  items,
  flush,
}: {
  title?: string;
  subtitle?: string;
  items: PerformanceTarget[];
  flush?: boolean;
}) {
  return (
    <div className={flush ? "pb-1" : "mb-10 sm:mb-14"}>
      <div className={flush ? "px-4 sm:px-6 lg:px-8" : "px-5 sm:px-8 lg:px-10"}>
        <div className="mx-auto flex w-fit max-w-7xl flex-col items-center">
          {!flush && title ? (
            <RailTitle title={title} subtitle={subtitle} />
          ) : null}
          {!flush && title ? (
            <div
              className="mb-4 h-px w-full bg-zinc-700 sm:mb-5"
              aria-hidden
            />
          ) : null}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
            {items.map((item, i) => {
              const poster = tmdbPoster(item.posterPath);
              const href = movieHrefFromStatic(item);
              return (
                <CleanPosterLink
                  key={`${item.actor}:${item.movie}`}
                  href={href}
                  poster={poster}
                  actorName={item.actor}
                  characterName={item.character}
                  movieTitle={item.movie}
                  priority={i < 4}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PosterRail({
  title,
  subtitle,
  performances,
  characterTargets,
  flush,
}: {
  title?: string;
  subtitle?: string;
  performances: EnrichedPerformance[];
  characterTargets: PerformanceTarget[];
  flush?: boolean;
}) {
  const router = useRouter();

  if (!performances.length) return null;

  return (
    <div className={flush ? "pb-1" : "mb-10 sm:mb-14"}>
      <div className={flush ? "px-4 sm:px-6 lg:px-8" : "px-5 sm:px-8 lg:px-10"}>
        <div className="mx-auto flex w-fit max-w-7xl flex-col items-center">
          {!flush && title ? (
            <RailTitle title={title} subtitle={subtitle} />
          ) : null}
          {!flush && title ? (
            <div
              className="mb-4 h-px w-full bg-zinc-700 sm:mb-5"
              aria-hidden
            />
          ) : null}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
            {performances.map((perf, i) => {
              const actor = perf.actor!;
              const movie = perf.movie!;
              const href = getMovieUrl({
                id: perf.movieId,
                title: movie.title,
                year: movie.year,
                slug: movie.slug,
              });
              const poster =
                upgradePosterThumbRes(movie.posterUrl) ??
                movie.posterUrl ??
                null;
              const face = upgradeActorImageRes(actor.imageUrl);
              const character =
                perf.character?.trim() ||
                characterFallback(actor.name, movie.title, characterTargets);

              return (
                <div
                  key={
                    performanceKey(perf) ?? `${perf.actorId}-${perf.movieId}`
                  }
                  className="flex-shrink-0"
                >
                  <CleanPosterLink
                    href={href}
                    poster={poster}
                    face={face}
                    actorName={actor.name}
                    characterName={character}
                    movieTitle={movie.title}
                    priority={i < 4}
                    onPrefetch={() => router.prefetch(href)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function orderByTargets(
  rows: EnrichedPerformance[],
  targets: Array<{ actor: string; movie: string }>,
): EnrichedPerformance[] {
  const map = new Map<string, EnrichedPerformance>();
  for (const p of rows) {
    const k = performanceKey(p);
    if (k) map.set(k, p);
  }
  return targets
    .map((t) => map.get(`${t.actor}:${t.movie}`))
    .filter((p): p is EnrichedPerformance => Boolean(p));
}

function actorThumbRes(url?: string | null): string | null {
  if (!url) return null;
  return url
    .replace("/t/p/w45/", "/t/p/w185/")
    .replace("/t/p/w92/", "/t/p/w185/");
}

/** Portrait headshot tile → actor page (rect, not circle — TMDB faces aren’t centered for round crops) */
export function ActorFaceLink({
  actor,
  priority,
  onPrefetch,
}: {
  actor: RailActor;
  priority?: boolean;
  onPrefetch?: () => void;
}) {
  const href = getActorUrl({
    id: actor.id,
    name: actor.name,
    slug: actor.slug,
  });
  const face = actorThumbRes(actor.imageUrl) ?? actor.imageUrl ?? null;
  const initial = actor.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={onPrefetch}
      className="group flex-shrink-0 w-[72px] sm:w-[80px] md:w-[88px] snap-start text-center"
      title={actor.name}
    >
      <div className="origin-center transition-transform duration-300 will-change-transform group-hover:scale-[1.03]">
        <div className="relative mx-auto aspect-[2/3] w-full overflow-hidden rounded-md bg-[#141414] ring-1 ring-white/[0.08] transition-[box-shadow] duration-300 group-hover:ring-[#FFD700]/35">
          {face ? (
            <Image
              src={face}
              alt={actor.name}
              fill
              className="object-cover object-[center_20%]"
              sizes="110px"
              priority={priority}
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-lg font-semibold text-zinc-500">
              {initial}
            </div>
          )}
        </div>
      </div>
      <p
        className="mt-2 text-[11px] sm:text-xs font-medium text-zinc-400 leading-tight line-clamp-2 group-hover:text-white transition-colors"
        style={SANS}
      >
        {actor.name}
      </p>
    </Link>
  );
}

/** Horizontal scroll rail of familiar / popular actors */
export function ActorRail({
  title = "Familiar Faces",
  subtitle,
  actors,
}: {
  title?: string;
  subtitle?: string;
  actors: RailActor[];
}) {
  const router = useRouter();

  if (!actors.length) return null;

  return (
    <div className="mb-10 sm:mb-14">
      <div className="px-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center">
          <RailTitle title={title} subtitle={subtitle} />
          <div
            className="mb-4 h-px w-full bg-zinc-700 sm:mb-5"
            aria-hidden
          />
          <div className="relative w-full">
            <div className="w-full flex gap-3.5 sm:gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pt-2.5 pb-2.5 pl-3 pr-12 sm:pl-3.5 sm:pr-16">
              {actors.map((actor, i) => {
                const href = getActorUrl({
                  id: actor.id,
                  name: actor.name,
                  slug: actor.slug,
                });
                return (
                  <ActorFaceLink
                    key={actor.id || actor.slug || actor.name}
                    actor={actor}
                    priority={i < 6}
                    onPrefetch={() => router.prefetch(href)}
                  />
                );
              })}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-14 sm:w-20 bg-gradient-to-l from-black via-black/70 to-transparent"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}
