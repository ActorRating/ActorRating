/**
 * Utility functions to filter out joke-like performances that shouldn't be treated as real acting credits.
 * 
 * Rule: If IMDb wouldn't treat it as a real acting credit → we shouldn't either.
 */

/**
 * Allowlist of legitimate films that must never be auto-deleted.
 * These are protected regardless of keyword matches.
 */
const PROTECTED_FILMS = new Set([
  'East of Eden (1955)',
  'East of Eden',
  'The Onion Movie (2008)',
  'The Onion Movie',
  'Miracle Apples (2013)',
  'Miracle Apples',
]);

/**
 * Checks if a film is on the protected allowlist.
 */
function isProtectedFilm(title: string, year?: number | null): boolean {
  const titleWithYear = year ? `${title} (${year})` : title;
  return PROTECTED_FILMS.has(title) || PROTECTED_FILMS.has(titleWithYear);
}

/**
 * Checks if a movie title or overview indicates it's a joke performance
 * that should be excluded from the database.
 * 
 * Excludes:
 * - TikTok sagas
 * - YouTube skits
 * - Web shorts
 * - Meme content
 * - Fan edits
 * - "Director's cut" of social media content
 * - Compilation DVDs/bloopers
 * - Parody videos/skits (but NOT feature-length parody films)
 * 
 * PROTECTS:
 * - Films released before 2010 (classics)
 * - Films with directors (legitimate releases)
 * - Feature-length parody films (standalone releases)
 * - Films on the allowlist
 */
export function isJokePerformance(
  title: string,
  overview?: string | null,
  year?: number | null,
  director?: string | null
): boolean {
  if (!title) return false;

  // STEP 1: Check allowlist - protected films are NEVER deleted
  if (isProtectedFilm(title, year)) {
    return false;
  }

  // STEP 2: Protect older films (pre-2010) - they're likely legitimate classics
  // Only flag them if they have VERY strong indicators of being joke content
  const isOlderFilm = year && year < 2010;
  const hasDirector = director && director.trim() !== '' && director.toLowerCase() !== 'unknown';

  const titleLower = title.toLowerCase().trim();
  const overviewLower = (overview || '').toLowerCase().trim();
  const searchText = `${titleLower} ${overviewLower}`;

  // STEP 3: Safe-to-delete patterns (high confidence, always exclude)
  const safeToDeletePatterns = [
    // TikTok content (always exclude)
    /\btiktok\s+saga\b/i,
    /\btik\s*tok\s+saga\b/i,
    /\bdirector'?s\s+cut.*tiktok\b/i,
    /\btiktok.*director'?s\s+cut\b/i,
    
    // Compilation DVDs and collections (safe to delete)
    /\b(dvd|blu.?ray)\s+(compilation|collection|set)\b/i,
    /\bcompilation\s+(dvd|blu.?ray|collection)\b/i,
    /\bvolume\s+\d+\s+(compilation|collection)\b/i,
    
    // Bloopers compilations (safe to delete)
    /\bbloopers?\s+(uncensored|compilation|collection|dvd)\b/i,
    /\b(uncensored|compilation).*bloopers?\b/i,
    
    // "Best of" compilations (safe to delete)
    /\bbest\s+of\s+(.*?)\s+(compilation|collection|dvd)\b/i,
    /\bcompilation.*best\s+of\b/i,
    
    // Clip compilations (safe to delete)
    /\b(clip|clips)\s+compilation\b/i,
    /\bcompilation\s+of\s+clips\b/i,
    
    // Trailer compilations (safe to delete)
    /\btrailer\s+compilation\b/i,
    /\bcompilation\s+of\s+trailers\b/i,
    
    // Meme content (always exclude)
    /\bmeme\s+(video|compilation)\b/i,
    /\bcompilation.*meme\b/i,
    
    // Fan edits (always exclude)
    /\bfan\s+(edit|made|video)\b/i,
    
    // Social media specific content (always exclude)
    /\binstagram\s+(story|reel|video|short)\b/i,
    /\bsnapchat\s+(story|video|short)\b/i,
    /\btwitter\s+(video|thread)\b/i,
    /\bx\s+(video|thread)\b/i,
    
    // YouTube skits/shorts (but NOT YouTube movies)
    /\byoutube\s+(skit|short|series)\b/i,
    /\byoutube\s+original\s+(skit|short)\b/i,
    
    // Web shorts (but NOT web series that are legitimate)
    /\bweb\s+short\b/i,
    /\bdigital\s+short\b/i,
    /\bonline\s+short\b/i,
    
    // Reaction videos
    /\breaction\s+(video|to)\b/i,
    /\bcompilation\s+of\s+(tiktok|youtube|videos)\b/i,
    
    // Behind the scenes of social media
    /\bbehind\s+the\s+scenes\s+(of\s+)?(tiktok|youtube|social\s+media)\b/i,
    
    // Self-referential social media content
    /\b(tiktok|youtube)\s+(as\s+a\s+)?movie\b/i,
    /\b(tiktok|youtube)\s+cinematic\b/i,
  ];

  // Check safe-to-delete patterns first
  for (const pattern of safeToDeletePatterns) {
    if (pattern.test(searchText)) {
      // Even safe patterns don't delete older films with directors
      if (isOlderFilm && hasDirector) {
        continue; // Skip deletion for protected older films
      }
      return true;
    }
  }

  // STEP 4: Specific compilation/TV special patterns (more targeted)
  // Only catch these when they're clearly compilations or TV specials
  const compilationSpecialPatterns = [
    // SNL/TV show compilations
    /\b(saturday\s+night\s+live|snl)\s+(christmas|best\s+of|compilation|special)\b/i,
    /\b(best\s+of|compilation).*\b(saturday\s+night\s+live|snl)\b/i,
    
    // TV show "Best of" compilations
    /\bbest\s+of\s+.*\s+(compilation|collection|dvd|special)\b/i,
    
    // Christmas/TV specials that are compilations
    /\b(christmas|holiday|tv)\s+special.*(compilation|collection|best\s+of)\b/i,
    
    // Parody videos/skits (but NOT standalone parody films)
    /\bparody\s+(video|skit|compilation)\b/i,
    /\b(video|skit)\s+parody\b/i,
    
    // Sketch compilations
    /\bsketch\s+(compilation|collection|best\s+of)\b/i,
  ];

  for (const pattern of compilationSpecialPatterns) {
    if (pattern.test(searchText)) {
      // Protect older films and films with directors
      if (isOlderFilm && hasDirector) {
        continue;
      }
      return true;
    }
  }

  // STEP 5: Additional checks for titles that are suspiciously short or contain only platform names
  // But protect older films even with these patterns
  const suspiciousTitlePatterns = [
    /^tiktok\s*$/i,
    /^youtube\s*$/i,
    /^instagram\s*$/i,
    /^snapchat\s*$/i,
    /^meme\s*$/i,
  ];

  for (const pattern of suspiciousTitlePatterns) {
    if (pattern.test(titleLower)) {
      // Protect older films even with suspicious titles
      if (isOlderFilm && hasDirector) {
        continue;
      }
      return true;
    }
  }

  return false;
}

/**
 * Checks if a movie should be excluded based on TMDB data.
 * This can be used when we have more detailed movie information from TMDB.
 */
export function shouldExcludeMovieFromTMDB(
  title: string,
  overview?: string | null,
  mediaType?: string | null,
  runtime?: number | null,
  year?: number | null,
  director?: string | null
): boolean {
  // First check the basic joke performance filter with full context
  if (isJokePerformance(title, overview, year, director)) {
    return true;
  }

  // Exclude if media type is explicitly not a movie
  if (mediaType && !['movie', 'tv'].includes(mediaType.toLowerCase())) {
    return true;
  }

  // Very short runtime might indicate a short/skit (but be careful - some legitimate shorts exist)
  // We'll be conservative and only exclude extremely short content (< 5 minutes)
  if (runtime && runtime < 5) {
    // But allow it if it's a legitimate short film (check title/overview)
    const titleLower = title.toLowerCase();
    if (!titleLower.includes('short') && !titleLower.includes('skit')) {
      // Might be legitimate, don't exclude based on runtime alone
      return false;
    }
    return true;
  }

  return false;
}

