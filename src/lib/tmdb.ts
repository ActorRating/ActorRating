import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

/** Delay between TMDB requests (~40 requests / 10 seconds). Increase if you hit 429. */
const TMDB_MIN_DELAY_MS = 200;

let lastTmdbCallAt = 0;

/**
 * Call before each TMDB API request so we stay under rate limits.
 * Serialize all TMDB credit fetches and wait 200ms since last call.
 */
export async function rateLimitTmdb(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastTmdbCallAt;
  if (elapsed < TMDB_MIN_DELAY_MS) {
    await new Promise((r) => setTimeout(r, TMDB_MIN_DELAY_MS - elapsed));
  }
  lastTmdbCallAt = Date.now();
}

export interface MovieSearchResult {
  id: number;
  title: string;
  release_date: string;
  overview?: string;
}

export interface Actor {
  id?: number;
  name: string;
  character: string;
}

export interface MovieCredits {
  director: string;
  cast: Actor[];
}

/** Cast member with TMDB id for ingestion (actor upsert by tmdbId). Billing order = array index. */
export interface CastMemberForIngestion {
  id: number | null;
  name: string;
  character: string;
  /** TMDB profile_path (e.g. "/abc.jpg") for Actor.imageUrl. */
  profilePath?: string | null;
}

/** Credits for ingestion: full credited cast (no importance filter), director for validation. */
export interface MovieCreditsForIngestion {
  director: string;
  cast: CastMemberForIngestion[];
}

const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

/**
 * Upgrade a stored TMDB actor imageUrl to a higher resolution for large display contexts.
 * Stored images use w185; for full-card / hero display, swap to h632 (portrait, ~422×632).
 * Safe to call with any URL — non-TMDB or already-upgraded URLs are returned unchanged.
 */
export function upgradeActorImageRes(url: string | null | undefined): string | null {
  if (!url) return null;
  // TMDB profile sizes we want to upgrade from → to
  return url
    .replace('/t/p/w185/', '/t/p/h632/')
    .replace('/t/p/w92/', '/t/p/h632/')
    .replace('/t/p/w45/', '/t/p/h632/');
}

export type TmdbMovieDetails = {
  posterPath: string | null
  voteAverage: number | null
  voteCount: number | null
}

/**
 * Fetch movie details from TMDB by numeric movie ID (poster + vote fields).
 * Returns null if the request fails or the movie is not found.
 */
export async function getMovieDetails(tmdbMovieId: number): Promise<TmdbMovieDetails | null> {
  await rateLimitTmdb();
  if (!API_KEY) return null;
  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbMovieId}?api_key=${API_KEY}&language=en-US`;
    const response = await axios.get(url, { timeout: 15000 });
    const { poster_path, vote_average, vote_count } = response.data;
    return {
      posterPath: typeof poster_path === 'string' ? poster_path : null,
      voteAverage: typeof vote_average === 'number' && Number.isFinite(vote_average) ? vote_average : null,
      voteCount: typeof vote_count === 'number' && Number.isFinite(vote_count) ? Math.trunc(vote_count) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Build a full TMDB poster URL from a poster_path (e.g. "/abc.jpg").
 * Returns null if posterPath is falsy.
 */
export function buildPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) return null;
  return posterPath.startsWith('/')
    ? `${TMDB_POSTER_BASE}${posterPath}`
    : `${TMDB_POSTER_BASE}/${posterPath}`;
}

export async function searchMovie(title: string): Promise<MovieSearchResult | null> {
  if (!API_KEY) {
    throw new Error('TMDB_API_KEY is not set')
  }
  try {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&language=en-US&page=1&include_adult=false`
    const response = await axios.get(url);

    const results = response.data.results;
    if (results && results.length > 0) {
      const firstResult = results[0];
      return {
        id: firstResult.id,
        title: firstResult.title,
        release_date: firstResult.release_date,
        overview: firstResult.overview
      };
    }

    return null;
  } catch (error) {
    console.error('Error searching for movie:', error);
    throw new Error('Failed to search for movie');
  }
}

export async function getMovieCredits(movieId: number): Promise<MovieCredits> {
  if (!API_KEY) {
    throw new Error('TMDB_API_KEY is not set')
  }
  try {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=en-US`
    const response = await axios.get(url);

    const { crew, cast } = response.data;

    // Find the director
    const director = crew?.find((member: { job?: string; name?: string }) => member.job === 'Director')?.name || 'Unknown';

    // Filter cast according to criteria
    const filteredCast: Actor[] = cast
      ?.filter((member: { order?: number; character?: string; name?: string; id?: number }) => {
        // Allow a broader set of credited cast (raise order threshold significantly)
        if (typeof member.order === 'number' && member.order >= 50) return false;
        // Check character is defined
        if (!member.character) return false;
        // Exclude generic/uncredited entries
        const characterLower = String(member.character).toLowerCase();
        const excludedTerms = ['uncredited', 'himself', 'herself', 'background', 'crowd', '#'];
        return !excludedTerms.some(term => characterLower.includes(term));
      })
      .map((member: { id?: number; name: string; character: string }) => ({
        id: typeof member.id === 'number' ? member.id : undefined,
        name: member.name,
        character: member.character
      })) || [];

    return {
      director,
      cast: filteredCast
    };
  } catch (error) {
    console.error('Error fetching movie credits:', error);
    throw new Error('Failed to fetch movie credits');
  }
}

/**
 * Fetch full credited cast for ingestion. Rate-limited (do not parallelize).
 * We store the full cast so re-runs and tiering stay correct; ensemble detection uses cast size.
 * TMDB returns cast in billing order; array index is used as 0-based order.
 * Guard: cast members with no name are dropped (skip with no write).
 */
export async function getMovieCreditsForIngestion(movieId: number): Promise<MovieCreditsForIngestion> {
  await rateLimitTmdb();
  if (!API_KEY) {
    throw new Error('TMDB_API_KEY is not set');
  }
  try {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=en-US`;
    const response = await axios.get(url, { timeout: 30000 });
    const { crew, cast } = response.data;
    const director = crew?.find((member: { job?: string; name?: string }) => member.job === 'Director')?.name ?? 'Unknown';

    // Guard: skip cast member with no name (no write for nameless entry).
    const fullCast: CastMemberForIngestion[] = (cast ?? [])
      .filter((member: { name?: string; character?: string }) => !!member?.name)
      .map((member: { id?: number; name: string; character?: string; profile_path?: string }) => {
        const character = member.character ?? '';
        const characterLower = character.toLowerCase();
        const excludedTerms = ['uncredited', 'himself', 'herself', 'background', 'crowd', '#'];
        const skip = excludedTerms.some((term) => characterLower.includes(term));
        if (skip) return null;
        return {
          id: typeof member.id === 'number' ? member.id : null,
          name: member.name,
          character,
          profilePath: typeof member.profile_path === 'string' ? member.profile_path : null,
        };
      })
      .filter((m: CastMemberForIngestion | null): m is CastMemberForIngestion => m != null);

    return { director, cast: fullCast };
  } catch (error) {
    console.error('Error fetching movie credits for ingestion:', error);
    throw new Error('Failed to fetch movie credits');
  }
} 