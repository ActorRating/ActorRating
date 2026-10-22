# Task 7 — Movie page SSR plan (not implemented)

## Current behavior

`src/app/movies/[slug]/page.tsx`:

1. Looks up featurette flag via Prisma.
2. Self-fetches `${BASE_URL}/api/movies/${slug}` during SSR (`revalidate: 21600`).
3. On non-OK / throw → falls back to `<MoviePageClient />` (thin HTML).
4. On success → JSON-LD + client hydrate with API payload.

## Why not low-risk to mirror actors today

| Risk | Detail |
|------|--------|
| Adult / junk filters | `/api/movies/[id]` applies filters and 410 paths that the page partially duplicates; a Prisma loader must match exactly or SEO/UX diverge. |
| TMDB lazy `releaseDate` | API may hydrate year/release from TMDB on miss; loader must preserve that side effect or pages regress. |
| Cast hydration | Performances, order, images, seeded scores — large select graph; easy to drop fields the client expects. |
| Response shape | Client + JSON-LD depend on API JSON; any drift breaks MoviePageClient. |
| Self-fetch failure mode | Empty client fallback is intentional resilience; “throw on DB failure” changes ops behavior under DB blips. |

## Recommended plan (when approved)

1. Extract `loadMoviePageData(slug)` in `src/lib/movie-page-data.ts` by **moving** the Prisma query body from the API route into a shared module; keep `/api/movies/[id]` as a thin wrapper so response shape stays byte-compatible.
2. Add a capped `MoviePageCrawlShell` (cast list + scores) like actors; key content in initial HTML for all UAs.
3. Page: `const data = await loadMoviePageData(slug)` → `notFound` / throw on hard failure; remove self-fetch.
4. Tests: loader parity vs API fixture; featurette 410; adult filter; empty cast; JSON-LD Movie aggregate still n≥3.
5. Ship behind a short staging check on 5–10 heavy movies (cast size, posters).

## Decision needed

Approve the shared-loader extraction (API becomes wrapper) before coding. Until then, **no movie SSR change** in this pass.
