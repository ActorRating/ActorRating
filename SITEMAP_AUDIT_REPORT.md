# Sitemap & Discovery Audit Report

**Purpose:** Explain why Google Search Console shows only **159 discovered URLs** while your sitemap checker reports **~49,000 URLs**.

---

## 1. Files inspected

| Path                               | Type                       | Location in codebase                                              |
| ---------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| `/sitemap.xml`                     | Sitemap index (dynamic)    | `src/app/sitemap.xml/route.ts`                                    |
| `/sitemaps/static.xml`             | Child sitemap              | `src/app/sitemaps/[...slug]/route.ts` → `generateStaticSitemap()` |
| `/sitemaps/actors.xml`             | Child sitemap              | same file → `generateActorsSitemap()`                             |
| `/sitemaps/movies.xml`             | Child sitemap              | same file → `generateMoviesSitemap()`                             |
| `/sitemaps/performances-1.xml` … N | Child sitemaps (paginated) | same file → `generatePerformancesSitemap(pageNum)`                |

---

## 2. Sitemap index (`/sitemap.xml`)

### Is it a proper sitemap index?

**Yes.** It returns valid XML with:

- `<?xml version="1.0" encoding="UTF-8"?>`
- Root: `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
- Child entries are `<sitemap>` with `<loc>` and `<lastmod>` (no `<url>` in the index).

### Does it reference ALL child sitemaps?

**Yes.** It always includes:

1. `{BASE_URL}/sitemaps/static.xml`
2. `{BASE_URL}/sitemaps/actors.xml`
3. `{BASE_URL}/sitemaps/movies.xml`
4. `{BASE_URL}/sitemaps/performances-1.xml` … `performances-{N}.xml` where  
   `N = ceil(ratedPairsCount / 10000)`.

So all child sitemaps are listed. Performance sitemaps are only added when there is at least one rated pair (`performanceCount > 0`).

### Syntax issues

- **One cosmetic bug in the fallback (error path):** the second `<sitemap>` has inconsistent indentation (6 spaces instead of 2). XML is still valid; only style.
- **No missing `</sitemap>` or wrong nesting** in the success path.
- **XML escaping:** `escapeXml()` is used for all `<loc>` values (`&`, `<`, `>`, `"`, `'`), so special characters in URLs are safe.

### URLs: absolute, https, domain, www

- **Absolute:** All `<loc>` values use `BASE_URL` + path (e.g. `https://www.actorrating.com/sitemaps/static.xml`). No relative URLs.
- **HTTPS:** `BASE_URL` comes from `process.env.NEXT_PUBLIC_BASE_URL` (trailing slash stripped) or default `https://www.actorrating.com`. So production should be https.
- **www vs non-www:**
  - Default in code is **www:** `https://www.actorrating.com`.
  - `env.example` uses **non-www:** `NEXT_PUBLIC_BASE_URL=https://actorrating.com`.  
    If production uses the env value **without** www, then:
  - Sitemap and all child sitemap URLs would be **non-www** (e.g. `https://actorrating.com/...`).
  - `public/robots.txt` declares **www:** `Sitemap: https://www.actorrating.com/sitemap.xml`.  
    That would be a **www vs non-www mismatch**: robots points to www, sitemap could list non-www URLs. Google may then discover mostly one variant and show a lower “discovered” count for the other.

**Recommendation:** Align everything: either set `NEXT_PUBLIC_BASE_URL=https://www.actorrating.com` and keep robots as-is, or change robots to `https://actorrating.com/sitemap.xml` and use that as the canonical base everywhere.

---

## 3. URL counts (from your logic + local run)

Counts are derived from the same rules as your sitemaps (and `scripts/count-indexed-pages.ts`). A local run gave:

| Sitemap                | Rule                                                                                 | Local count (example) | Production (your ~49k)      |
| ---------------------- | ------------------------------------------------------------------------------------ | --------------------- | --------------------------- |
| **static.xml**         | Fixed list                                                                           | **6**                 | 6                           |
| **actors.xml**         | Actors with ≥1 rated performance **or** ≥5 performances                              | **43**                | likely hundreds–thousands   |
| **movies.xml**         | Movies with ≥1 rated performance **or** ≥5 performances; exclude junk/adult          | **24,146**            | ~24k+                       |
| **performances-1 … N** | Distinct (actorId, movieId) in `Rating`; paginated 10k per file; junk/adult excluded | **72** (1 file)       | ~24k+ (e.g. 3 files of 10k) |

- **Total (local):** 6 + 43 + 24,146 + 72 = **24,267**.
- **Total (production ~49k):** 6 + (actors) + (movies ~24k+) + (rate pages ~24k+) ≈ **~49,000** is consistent with the same logic and larger DB.

So the **structure and inclusion rules** support ~49k URLs; the index correctly points to all of them.

---

## 4. Sample URL checks (movies.xml & actors.xml)

Live checks were not possible (production returned 402). You can run these yourself:

```bash
# Fetch sitemaps and extract first 10 <loc> from each
curl -s "https://www.actorrating.com/sitemaps/movies.xml" | grep -oP '(?<=<loc>)[^<]+' | head -10
curl -s "https://www.actorrating.com/sitemaps/actors.xml" | grep -oP '(?<=<loc>)[^<]+' | head -10
```

For each URL, confirm:

- HTTP status **200** (and no 3xx unless you intend redirects).
- Page contains a **canonical** tag (see next section for current behavior).
- Canonical is **self-referencing** (same URL as the page).

---

## 5. Canonical and noindex (by section)

### Actors (`/actors/[id]`)

- **Canonical:** Set in `src/app/actors/[id]/layout.tsx`:  
  `alternates: { canonical: \`${baseUrl}/actors/${actor.slug || actor.id}\` }` 
→ Self-referencing if`baseUrl` matches the request host.
- **noindex:** `robots: { index: false, follow: true }` when the actor has **neither** ≥1 rated performance **nor** ≥5 performances. Otherwise no robots override (indexable). Aligned with sitemap (sitemap includes same set).

### Movies (`/movies/[slug]`)

- **Canonical:** **Not set.** There is no `alternates.canonical` in the movie layout. So Google may choose another variant (e.g. with/without query, or www vs non-www) as canonical, or index multiple URLs for the same movie.
- **noindex:** `robots: { index: false, follow: true }` when the movie has neither ≥1 rated performance nor ≥5 performances. Otherwise indexable. Aligned with sitemap.

### Rate pages (`/rate/[movieSlug]/[actorSlug]`)

- **Canonical:** **Not set.** No `alternates.canonical` in the rate layout. Same duplicate/variant risk as movies.
- **noindex:** `robots: { index: false, follow: true }` when `ratingCount === 0`. Otherwise indexable. Sitemap only lists rate pages with ≥1 rating, so again aligned.

**Summary:** Only **actor** pages have a self-referencing canonical. **Movies and rate pages do not.** That doesn’t reduce the number of URLs in the sitemap, but it can affect how many URLs Google “counts” as discovered vs. canonical and how consistently it indexes.

---

## 6. robots.txt

**File:** `public/robots.txt`

```
User-agent: *
Allow: /
Sitemap: https://www.actorrating.com/sitemap.xml
```

- **Is `/sitemaps/` allowed?** Yes. `Allow: /` allows every path, including `/sitemaps/`, `/sitemaps/static.xml`, `/sitemaps/actors.xml`, etc. Nothing disallows them.
- **Blocking of /movies/, /actors/, /rate/?** No. There are no `Disallow` rules. So robots.txt is **not** why Google would only discover 159 URLs.

---

## 7. Conditional noindex and unintended exclusions

### Rules in code (aligned with sitemap)

- **Actors:** Indexed only if ≥1 rated performance **or** ≥5 performances. Sitemap uses the same rule → no unintended exclusion.
- **Movies:** Indexed only if ≥1 rated performance **or** ≥5 performances; plus junk/adult excluded in both sitemap and layout. Same filters in `generateMoviesSitemap()` and movie layout → no mismatch.
- **Rate pages:** Indexed only if ≥1 rating. Sitemap only includes (actorId, movieId) pairs that exist in `Rating` → no mismatch.

So we are **not** conditionally applying noindex in a way that would exclude pages that are still listed in the sitemap. Every URL in the sitemap is intended to be indexable (no noindex) when visited.

### Possible edge cases

- **Caching:** Layout uses `unstable_cache` for rating count on rate pages (5 min). If a page gets its first rating between sitemap generation and layout render, the sitemap could list a URL that still renders noindex until cache revalidates. Minor and temporary.
- **Adult/junk:** If `isAdultContentMovie` / `isJunkMovieSlug` / `isAllowedMovieSlug` behave differently between sitemap generation and layout (e.g. different env or data), a URL could appear in the sitemap but then get noindex or not-found. Code paths look the same; worth keeping in mind for future changes.

---

## 8. Why Google might show only 159 discovered URLs

“Discovered” in Search Console usually means URLs Google has **seen** (e.g. from sitemaps or links), not necessarily all URLs that exist in your sitemap. So 159 can be a mix of:

### 8.1 Crawl budget and prioritization

- Google does not guarantee crawling every URL in a sitemap. For a site with ~49k URLs, it may:
  - Fetch the sitemap index.
  - Fetch only **some** of the child sitemaps (e.g. static + actors + first part of movies, or a sample of performance sitemaps).
  - Crawl a subset of the URLs from those files.
- **159** is consistent with: e.g. **6 (static) + ~43 (actors) + ~110 (first chunk of movies or one performance slice)**. So “159 discovered” can mean “what we’ve actually discovered so far from the sitemaps we’ve requested and processed,” not “total URLs in sitemap.”

### 8.2 Sitemap index not fully followed

- If Google’s fetcher has errors (timeouts, 5xx) when requesting `movies.xml` or `performances-*.xml` (large or slow responses), it might stop after a few child sitemaps. That would cap the number of discovered URLs.
- **Mitigation:** Ensure child sitemaps respond quickly (you already use 1h cache). Check GSC “Sitemaps” and “URL Inspection” / “Coverage” for errors or “Couldn’t fetch” for specific sitemap URLs.

### 8.3 www vs non-www split

- If `NEXT_PUBLIC_BASE_URL` is `https://actorrating.com` (no www) but robots.txt says `https://www.actorrating.com/sitemap.xml`:
  - Google might discover the index at **www** (from robots) and then get **non-www** URLs inside the sitemaps, or the other way around.
  - Discovery and indexing can be split across two hostnames, so “159 discovered” might be for one of them only.
- **Fix:** Use one canonical host (www or non-www) everywhere: `NEXT_PUBLIC_BASE_URL`, robots.txt, and any canonicals.

### 8.4 “Discovered – currently not indexed”

- In GSC, “Discovered” often includes “Discovered – currently not indexed.” So 159 could be “URLs we’ve discovered and are tracking,” while the rest are either not yet requested from the sitemap or not yet moved into “Discovered.” Ensuring the sitemap index and child sitemaps return 200 and are quickly accessible helps Google discover more.

### 8.5 New or low-authority site

- With a large number of URLs and limited crawl budget, Google may only request and process a small number of sitemap files and URLs at first. Over time, as the site gains authority and crawl budget, the discovered count can grow. 159 can be an early snapshot.

---

## 9. Recommendations (concise)

1. **Canonical:** Add self-referencing `alternates.canonical` for:
   - **Movies:** `src/app/movies/[slug]/layout.tsx` (e.g. `https://www.actorrating.com/movies/${slug}`).
   - **Rate pages:** `src/app/rate/[movieSlug]/[actorSlug]/layout.tsx` (e.g. `https://www.actorrating.com/rate/${movieSlug}/${actorSlug}`).  
     Use the same base URL as in sitemaps and robots.
2. **www vs non-www:** Align `NEXT_PUBLIC_BASE_URL`, `robots.txt` Sitemap line, and all canonicals on one host (prefer `https://www.actorrating.com` if that’s what you use in GSC).
3. **Sitemap fallback:** Fix the indentation of the second `<sitemap>` in the error fallback in `src/app/sitemap.xml/route.ts` for consistency (optional).
4. **Monitoring:** In GSC, check:
   - “Sitemaps”: any errors or “Couldn’t fetch” for `sitemap.xml` or `sitemaps/*.xml`.
   - “Pages” / “Why pages aren’t indexed”: “Discovered – currently not indexed” and “Crawled – currently not indexed” to see if the limit is discovery vs. indexing.
5. **Verify live:** Once production is reachable, confirm a sample of URLs from `movies.xml` and `actors.xml` return 200 and have the expected canonical (and that it’s self-referencing).

---

## 10. Summary

| Check                                   | Result                                                       |
| --------------------------------------- | ------------------------------------------------------------ |
| `/sitemap.xml` is a valid sitemap index | Yes                                                          |
| References all child sitemaps           | Yes (static, actors, movies, performances-1..N)              |
| Syntax / escaping                       | OK; one cosmetic indentation in error fallback               |
| URLs absolute, https, correct domain    | Yes; www vs non-www depends on env                           |
| www consistency                         | Risk if env uses non-www while robots uses www               |
| URL counts                              | Structure supports ~49k; local run ~24k                      |
| robots.txt                              | Allows /; no block on /sitemaps/, /movies/, /actors/, /rate/ |
| noindex vs sitemap                      | Aligned; no unintended exclusion                             |
| Canonical                               | Actors: yes; Movies & rate: **missing**                      |

**Most likely reason for “159 discovered”:** Google is only **partially** requesting and processing your sitemap set (crawl budget / prioritization), possibly combined with **www vs non-www** if base URL and robots differ. Adding canonicals and aligning the host everywhere will help Google consolidate and increase discovered URLs over time.
