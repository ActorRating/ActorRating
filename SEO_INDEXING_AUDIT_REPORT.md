# SEO & Indexing Audit Report — ActorRating.com

**Date:** March 6, 2025  
**Scope:** Sitemap, canonicals, redirects, internal linking, crawl efficiency, and causes of "Crawled – currently not indexed."

---

## 1. Sitemap implementation

### 1.1 Files audited

- `src/app/sitemap.xml/route.ts` — sitemap index
- `src/app/sitemaps/[...slug]/route.ts` — child sitemaps (static, actors, movies, performances-N)

### 1.2 Domain consistency (www)

- **Base URL:** Both files use:
  ```ts
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.actorrating.com'
  ```
- **All `<loc>` values** are built from `BASE_URL` only (no hardcoded non-www).
- **Conclusion:** With `NEXT_PUBLIC_BASE_URL=https://www.actorrating.com` in Vercel, every sitemap URL is `https://www.actorrating.com/...`. No mixed www/non-www in sitemaps.

### 1.3 Sitemap index contents

The index always includes:

1. `https://www.actorrating.com/sitemaps/static.xml`
2. `https://www.actorrating.com/sitemaps/actors.xml`
3. `https://www.actorrating.com/sitemaps/movies.xml`
4. `https://www.actorrating.com/sitemaps/performances-1.xml` … `performances-N.xml` where  
   `N = Math.ceil(performanceCount / 10000)` and `performanceCount` = raw `COUNT(DISTINCT (actorId || '-' || movieId))` from `Rating`.

Error fallback (lines 61–75) returns only static, actors, and movies (no performance sitemaps). That is acceptable for a minimal recovery.

### 1.4 Performance sitemap count mismatch (medium priority)

- **Index** uses **raw** count from `Rating` (no adult/junk filtering).
- **Child sitemap** `generatePerformancesSitemap()` filters out adult/junk movies and builds `uniqueCombinations` from that filtered list.
- If the **filtered** number of rate-page URLs is smaller than the raw count, then:
  - The index may list e.g. `performances-2.xml` while the filtered list fits in one file.
  - Requesting `performances-2.xml` then yields `slice(10000, 20000)` on a list of e.g. 8,000 → empty → **404 "Sitemap page not found"**.

**Recommendation:** Derive `performanceSitemapCount` from the **filtered** list (e.g. run the same filtering logic and use `Math.ceil(filteredLength / MAX_URLS_PER_SITEMAP)`), or centralize the filtered list and use its length for both the index and the child sitemaps, so the index never references a performance sitemap that 404s.

---

## 2. Canonical consistency

### 2.1 Source of canonical base

All canonicals use:

```ts
process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.actorrating.com'
```

So with the same env in Vercel, canonicals and sitemap share the same base.

### 2.2 Page-level canonicals

| Page type      | File                          | Canonical format                                      | Matches sitemap? |
|----------------|-------------------------------|--------------------------------------------------------|------------------|
| Root           | `src/app/layout.tsx`          | `https://www.actorrating.com` (hardcoded)             | Yes              |
| Actor          | `src/app/actors/[id]/layout.tsx` | `{baseUrl}/actors/{slug \|\| id}`                    | Yes (sitemap uses slug \|\| id) |
| Movie          | `src/app/movies/[slug]/layout.tsx` | `{baseUrl}/movies/{slug \|\| id}`                  | Yes              |
| Rate           | `src/app/rate/.../layout.tsx` | `{baseUrl}/rate/{movieSlug}/{actorSlug}` (from URL)   | Yes (sitemap uses movie/actor slug \|\| id) |
| Short link     | `src/app/r/[slug]/page.tsx`   | Has `alternates.canonical`                            | N/A (not in sitemap) |

Actor/movie/rate canonicals are built from the same identifiers (slug or id) as the sitemap. No conflict.

### 2.3 Open Graph / default metadata

- Root layout: `openGraph.url: "https://www.actorrating.com"`, `alternates.canonical: "https://www.actorrating.com"`.
- Rate layout: `openGraph.url: canonical` (same as canonical).

Canonicals and sitemap URLs are aligned on **https://www.actorrating.com**.

---

## 3. Redirects and duplicate paths

### 3.1 Non-www → www (301)

**`vercel.json`:**

```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": "actorrating.com" }],
      "destination": "https://www.actorrating.com/$1",
      "permanent": true
    }
  ]
}
```

- **Confirmed:** Requests to `https://actorrating.com` (and any path) are redirected with **301** to `https://www.actorrating.com/$1`. No duplicate indexing of the same content on two hostnames.

### 3.2 Duplicate actor routes (existing finding)

Per `DUPLICATE_ACTOR_ROUTES_VERIFICATION.md`, there are **986** static-segment routes under `/actors/<uuid-or-cuid>/` that use `force-dynamic`. The **sitemap** only lists slug-based actor URLs (from `actors.xml`), not these UUID/CUID paths. So:

- Sitemap: only `/actors/{slug}` (or id when slug is null).
- Duplicate routes: `/actors/<uuid>`, `/actors/<cuid>` — not in sitemap.

Those duplicate URLs are still crawlable via links. If any internal or external links point to `/actors/<uuid>` instead of `/actors/<slug>`, Google could see both and treat them as duplicate content; the canonical on the slug page points to itself. The UUID/CUID pages are client-rendered and set 410 in the client when UUID is detected. For a clean signal, consider 301-redirecting `/actors/<uuid>` and `/actors/<cuid>` to the canonical slug URL at the server (e.g. in middleware or route handler) so only one URL is indexed.

---

## 4. "Crawled – currently not indexed" — likely causes

Google has chosen not to index many URLs despite crawling them. Common causes and how they apply here:

### 4.1 Low perceived value / thin content

- **Actor and movie pages:** Content is largely lists and structured data. If there is little unique prose or differentiation, Google may deprioritize them.
- **Rate pages:** `PerformanceSEOContent` adds hidden, unique text (actor + movie + methodology). That helps, but rate pages are still relatively thin (one performance, one CTA).
- **Recommendation:** Add more unique, visible text where possible (e.g. short intro or context per actor/movie) without sacrificing UX.

### 4.2 Duplicate or near-duplicate content

- **Canonicals:** Aligned; no conflict between sitemap and canonical.
- **Actor UUID/CUID routes:** As above, duplicate routes can create duplicate-looking content if linked. Server-side 301 to slug URL would help.

### 4.3 Canonical conflicts

- **None found.** All canonicals use the same www base and match sitemap URL patterns.

### 4.4 Internal linking

- **Actor → movie:** Actor pages link to movie pages via `getMovieUrl()` (e.g. performance cards, “Highest rated”).
- **Movie → actor:** Movie pages link to actor pages via `getActorUrl()` (e.g. performance cards, “Highest rated”).
- **Actor/movie → rate:** Both link to rate pages via `getRateUrl()` (performance cards, etc.).
- **Rate → actor/movie:** Rate page has no `<Link>` to actor or movie pages; only a generic “Back” button and JSON-LD. So **rate pages do not link out to actor or movie pages**. That weakens internal linking for performance URLs.
- **Recommendation:** Add at least one visible link from each rate page to the corresponding actor page and movie page (e.g. “View all performances in [Movie]” / “See [Actor]’s other roles”). This improves discoverability and passes link equity.

### 4.5 Crawl budget

- **~47k URLs** is large for a new or low-authority site. Google may crawl many but index fewer, prioritizing home, key landing pages, and well-linked content.
- **Sitemap structure:** Index + child sitemaps (static, actors, movies, performances) is appropriate. The only risk is performance sitemap 404s (see §1.4), which can waste crawl and reduce trust.

---

## 5. Internal linking summary

| From        | To (movies)     | To (actors)     | To (rate)     |
|------------|------------------|-----------------|----------------|
| Actor page | Yes (performance cards, etc.) | —               | Yes (rate CTA) |
| Movie page | —                | Yes (performance cards, etc.) | Yes (rate CTA) |
| Rate page  | No               | No              | —              |

Gap: **rate pages do not link to actor or movie pages.** Adding those links is a concrete improvement for indexing and crawl depth.

---

## 6. Crawl efficiency

### 6.1 Dynamic generation and completeness

- Sitemap index and child sitemaps are generated at request time from the database. With a healthy DB and no timeouts, output is complete for the current data.
- **Risk:** Under load or slow DB, a child sitemap (especially large `actors.xml` / `movies.xml`) could time out and return 5xx, so Google might see incomplete or failed sitemaps. Mitigation: caching (see below) and stable DB performance.

### 6.2 Caching headers

| Resource        | Cache-Control |
|----------------|----------------|
| Sitemap index  | `public, s-maxage=3600, stale-while-revalidate=86400` |
| Child sitemaps | `public, s-maxage=3600, stale-while-revalidate=86400` |
| Error fallback index | `public, s-maxage=300, stale-while-revalidate=3600` |

1-hour cache with 24h stale-while-revalidate is appropriate for sitemaps that change daily at most. No issue found.

### 6.3 Pagination (performance sitemaps)

- **Index:** `performanceSitemapCount = Math.ceil(performanceCount / 10000)` with `performanceCount` = raw distinct (actorId, movieId) from `Rating`.
- **Child:** Same 10,000-URL page size; filtering by adult/junk can reduce the effective list length. If the filtered list is shorter than the raw count, the index can still list an extra `performances-N.xml` that returns 404 (see §1.4). Fix: base `performanceSitemapCount` on the filtered count so every listed performance sitemap returns 200 with a valid urlset.

---

## 7. robots.txt

**`public/robots.txt`:**

```
User-agent: *
Allow: /
Sitemap: https://www.actorrating.com/sitemap.xml
```

- Allows all paths; no conflict with sitemap or canonical.
- Sitemap URL is www; matches current setup.

---

## 8. Summary and recommendations

### 8.1 Current technical SEO status

- **Sitemap:** Structure is correct. All `<loc>` use www when `NEXT_PUBLIC_BASE_URL` is set to www. Index lists static, actors, movies, and performance sitemaps.
- **Canonicals:** All use the same www base and match sitemap URL patterns. No canonical conflicts found.
- **Redirects:** 301 from non-www to www is correctly configured in Vercel.
- **Internal links:** Actor ↔ movie and actor/movie → rate are in place. Rate → actor/movie is missing.
- **Crawl efficiency:** Caching is appropriate. One correctness issue: performance sitemap index can reference a child that 404s when filtered count is lower than raw count.

### 8.2 Critical issues

- **None.** Sitemap and canonical setup support indexing of ~47k pages. “Crawled – currently not indexed” is not explained by a technical error in sitemap or canonical.

### 8.3 Medium-priority improvements

1. **Performance sitemap index vs filtered count**  
   Derive `performanceSitemapCount` from the same filtered list used in `generatePerformancesSitemap()` (or use a single source of truth), so the index never lists a performance sitemap that returns 404.

2. **Internal links from rate pages**  
   Add visible links from each rate page to the corresponding actor page and movie page (e.g. in the header or under the CTA) to strengthen internal linking and discoverability of performance pages.

3. **Duplicate actor URLs (UUID/CUID)**  
   Optionally 301 redirect `/actors/<uuid>` and `/actors/<cuid>` to the canonical `/actors/<slug>` so only one URL per actor is indexed and crawl budget is not spent on duplicates.

### 8.4 Sitemap implementation verdict

**The sitemap implementation is correct for indexing.** All `<loc>` values use the www domain when env is set; the index lists all intended child sitemaps; and canonicals match sitemap URLs. With the performance sitemap count fix (§1.4), the only remaining blockers to indexing are quality and crawl-budget factors (content depth, internal links from rate pages, and possibly duplicate actor routes), not sitemap or canonical errors.

---

**Next steps**

1. Deploy the performance sitemap count fix so no performance sitemap URL in the index 404s.  
2. Add actor and movie links on rate pages.  
3. Monitor GSC: “Discovered” and “Indexed” over the next 2–4 weeks; check “Sitemaps” for errors on any child sitemap.  
4. Optionally add server-side 301 from `/actors/<uuid|cuid>` to `/actors/<slug>` and re-submit the sitemap after the change.
