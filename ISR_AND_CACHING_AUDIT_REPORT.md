# ISR Writes & Function Usage Audit Report

**Context:** ~886,000 ISR Writes, 1.6M Function Invocations, 516 GB-hours on Vercel — indicating excessive regeneration and/or bot traffic.

---

## 1. Scan Results: Caching & Dynamic Behavior

### 1.1 `export const revalidate`

| File                                              | Value  | Notes                          |
| ------------------------------------------------- | ------ | ------------------------------ |
| `src/app/rate/[movieSlug]/[actorSlug]/layout.tsx` | `300`  | 5 min — **ISR layout**         |
| `src/app/rate/[movieSlug]/[actorSlug]/page.tsx`   | `3600` | 1 hour — **ISR page**          |
| `src/app/actors/[id]/layout.tsx`                  | `300`  | Overridden by page (see below) |
| `src/app/movies/[slug]/layout.tsx`                | `300`  | Overridden by page (see below) |
| `src/app/r/[slug]/page.tsx`                       | `60`   | 1 min ISR (share pages)        |
| `src/app/api/performances/by-lookup/route.ts`     | `300`  | API route                      |

### 1.2 `revalidate = 0` (no cache)

| File                           | Context                                                                                                                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `middleware.ts` (lines 25, 53) | **Every** request to `/actors/[id]` and `/movies/[slug]` triggers an internal `fetch(..., { next: { revalidate: 0 } })` to check if actor/movie exists (for 410). So every actor/movie page view = 1 uncached API call from middleware. |

### 1.3 `dynamic = "force-dynamic"` (fully dynamic — no static/ISR)

| File                                                                           | Impact                                                                                                                                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/search/page.tsx`                                                      | **Every** `/search` and `/search?q=...` request runs the server. Bots hitting `/search?q=randomstring` = 1 function invocation per request. **Major driver of function invocations.** |
| `src/app/actors/[id]/page.tsx`                                                 | **Overrides layout.** Actor pages are **fully dynamic** despite layout `revalidate = 300`. Every actor URL hit = server run.                                                          |
| `src/app/movies/[slug]/page.tsx`                                               | Same — movie pages are **fully dynamic**.                                                                                                                                             |
| `src/app/onboarding/page.tsx`                                                  | Expected (auth flow).                                                                                                                                                                 |
| `src/app/dashboard/page.tsx`                                                   | Expected (user-specific).                                                                                                                                                             |
| `src/app/profile/page.tsx`                                                     | Expected.                                                                                                                                                                             |
| `src/app/performances/page.tsx`                                                | Expected.                                                                                                                                                                             |
| `src/app/performances/[id]/page.tsx`                                           | Expected.                                                                                                                                                                             |
| `src/app/rate/page.tsx`                                                        | Expected.                                                                                                                                                                             |
| Auth/signin/signup/error, profile/delete/export, login, rating-success         | Expected.                                                                                                                                                                             |
| **Many** `src/app/actors/<uuid>/page.tsx` (e.g. 47497d9a-..., b26c2a01-..., …) | Dozens of **stale static actor UUID routes** with `force-dynamic`; low traffic but add noise.                                                                                         |

### 1.4 `cache: "no-store"` and `fetch(..., { cache: "no-store" })`

| File                                                                              | Usage                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PerformanceRatingClientWrapper.tsx`                                              | `/api/ratings/me`, `/api/user/level-progress` — client-side; appropriate for user-specific data.              |
| `RatePageClient.tsx`                                                              | `/api/ratings/me` — same.                                                                                     |
| `DashboardClient.tsx`                                                             | `/api/ratings/me` and another fetch with `cache: 'no-store', next: { revalidate: 0 }` — user-specific.        |
| `MoviePageClient.tsx`                                                             | Internal fetches with `cache: 'no-store'` for movie/user-rating — **could be relaxed** for public movie data. |
| `ActorPageClient.tsx`                                                             | Same for actor/user-rating — user-specific part should stay no-store; public data could use cache.            |
| `onboarding/rate/page.tsx`                                                        | ratings/me, level-progress — user-specific.                                                                   |
| `UserProgressBar.tsx`, `LevelProgressBar.tsx`, `UserBadges.tsx`, `LevelBadge.tsx` | `/api/user/level-progress` — user-specific.                                                                   |
| `ActorRatingSection.tsx`                                                          | `/api/actors/${actorId}/user-rating` — user-specific.                                                         |
| `src/lib/api.ts`                                                                  | `cache: 'no-store'` for suggestions/performances — **consider short revalidate** for public data.             |
| `src/lib/shareGenerator.ts`                                                       | `cache: 'no-store'` — context-dependent.                                                                      |

### 1.5 `fetch(..., { next: { revalidate: ... } })`

- Rate layout/page: internal API fetches use `revalidate: 300`.
- Actor/Movie **pages** use `next: { revalidate: 60 }` but the **route** is `force-dynamic`, so the page is never statically cached; only the internal fetch is cached for 60s within the server run.

---

## 2. Dynamic Routes Summary

| Route                                                    | Statically generated? | ISR?                                            | Fully dynamic?            | Regenerating on every request?                                            |
| -------------------------------------------------------- | --------------------- | ----------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- |
| `/actors/[id]`                                           | No                    | **No** (page has `force-dynamic`)               | **Yes**                   | **Yes** — every request runs the server.                                  |
| `/movies/[slug]`                                         | No                    | **No** (page has `force-dynamic`)               | **Yes**                   | **Yes** — every request runs the server.                                  |
| `/rate/[movieSlug]/[actorSlug]`                          | Yes (force-static)    | **Yes** — revalidate 300 (layout) / 3600 (page) | No                        | **No** — but **every hit after revalidate window triggers an ISR write**. |
| `/search`                                                | No                    | No                                              | **Yes** (`force-dynamic`) | **Yes** — every request (including `?q=...`) runs the server.             |
| `/r/[slug]`                                              | Yes                   | Yes (revalidate 60)                             | No                        | No — revalidate every 60s.                                                |
| `/performances`, `/performances/[id]`                    | No                    | No                                              | Yes                       | Yes (expected).                                                           |
| Dashboard, profile, auth, onboarding, rate (index), etc. | No                    | No                                              | Yes                       | Yes (expected).                                                           |

---

## 3. Root Cause Analysis

### 3.1 Why ~886,000 ISR Writes?

- **Primary driver: `/rate/[movieSlug]/[actorSlug]` (rate pages).**
  - These are the **only** high-volume, **ISR-enabled** routes (force-static + revalidate 300/3600).
  - The sitemap includes **all rate pages with ≥1 rating** (paginated in `performances-1.xml`, …). That can be **tens or hundreds of thousands of URLs**.
  - When bots (or users) hit a rate page:
    - First hit or after revalidate: Next.js serves stale and triggers **background revalidation** = **1 ISR write** per URL.
  - So: **many rate URLs × many crawls × revalidate every 5–60 min ≈ hundreds of thousands of ISR writes.**

- **Secondary:** `revalidatePath('/dashboard')` and `revalidatePath(\`/r/${slug}\`)`in`api/ratings/route.ts`and`api/ratings/[id]/route.ts` on each rating submit. Each call triggers cache invalidation; volume depends on rating activity, not likely 886k alone.

### 3.2 Why 1.6M Function Invocations?

- **Search:** `/search` is `force-dynamic`. Every `/search` and `/search?q=...` request runs the server. Bots crawling `/search?q=randomstring` produce one invocation per request.
- **Actor and movie pages:** `force-dynamic` on the page overrides layout ISR. Every request to `/actors/...` and `/movies/...` runs the server. With ~49k+ actor URLs and many movie URLs in the sitemap, each crawl = tens of thousands of invocations.
- **Middleware:** For every `/actors/[id]` and `/movies/[slug]` request, middleware calls the API with `revalidate: 0`, so every such request = middleware + API route invocation.
- **APIs called with `cache: 'no-store'` from client:** e.g. `/api/ratings/me`, `/api/user/level-progress`, actor/movie user-rating — each user interaction can trigger multiple invocations.

### 3.3 Does `/search` use static generation with query params?

- **No.** `/search` is **force-dynamic**. It is **not** statically generated. Query params do **not** create separate static pages; every request is dynamic. So:
  - Query params do **not** cause “new ISR writes per unique query” (there is no ISR on search).
  - They **do** cause **one function invocation per request**, so bot traffic to `/search?q=...` directly drives function usage.

### 3.4 Could bots be crawling /search?q=randomstring?

- **Yes.** That would explain high function invocations for the search route. The SearchAction in JSON-LD on the home page points to `https://www.actorrating.com/search?q={search_term_string}`, which can encourage crawlers to try many queries.

---

## 4. Sitemap

- **Query parameters:** Sitemap does **not** include URLs with query parameters. Only:
  - `static.xml`: homepage, about, auth, privacy, oscars-2026
  - `actors.xml`: `/actors/{id-or-slug}`
  - `movies.xml`: `/movies/{slug}`
  - `performances-N.xml`: `/rate/{movieSlug}/{actorSlug}`
- **Rate pages:** The sitemap **does** include dynamic rate pages (only those with ≥1 rating). That is correct for SEO but means **every listed rate URL is a candidate for crawler-triggered ISR revalidation**.

---

## 5. Search Suggestions API

- **No `no-store`.** Uses `cacheGet`/`cacheSet` (e.g. in-memory or Redis) and sets `Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=120`.
- **Database:** Does DB work (prefix/token/similarity queries); caching by query reduces load. No change needed for “no-store” on the route itself.
- **Recommendation:** Optional edge/short response caching is already supported by Cache-Control; consider adding temporary logging (user-agent + path) to confirm bot traffic.

---

## 6. What Must Change to Reduce ISR Writes and Function Usage

### 6.1 Reduce ISR writes (target: near zero for stable content)

1. **Rate pages (`/rate/[movieSlug]/[actorSlug]`):**
   - **Increase revalidate** to reduce how often each URL triggers a write, e.g.:
     - Layout: `export const revalidate = 3600` (or 7200).
     - Page: keep `revalidate = 3600` or increase to 7200.
   - Align layout and page revalidate so you don’t have layout at 5 min and page at 1 hour (fewer revalidation cycles).
   - **Optional:** If you are comfortable with longer staleness, use `revalidate = 86400` (24h) for rate pages.

2. **Ensure actor/movie pages use ISR (and reduce invocations):**
   - **Remove** `export const dynamic = 'force-dynamic'` from:
     - `src/app/actors/[id]/page.tsx`
     - `src/app/movies/[slug]/page.tsx`
   - Rely on layout’s `revalidate = 300` (or set `export const revalidate = 3600` on the page for a single, clear value).
   - Then actor/movie pages will be **ISR** (revalidate every 5 min or 1 hour) instead of running on every request. That reduces **function invocations** and avoids unnecessary server runs; with a reasonable revalidate, ISR writes for these routes stay bounded.

3. **Middleware:**
   - Consider **caching** the existence check (e.g. short TTL or edge cache) so not every actor/movie request triggers an uncached `fetch(..., { next: { revalidate: 0 } })`. That will reduce API invocations from middleware.

### 6.2 Search: do not regenerate per query

- **Search is already not statically generated.** It is force-dynamic, so there are no “ISR writes per query.” To reduce **function invocations** from search:
  - **Option A:** Make `/search` a **client-only** experience: serve a minimal static shell (no `force-dynamic`) and do all search via client-side fetch to `/api/search`. Then only the API is hit per query; you can rely on API caching and rate limiting.
  - **Option B:** Keep server render but add **rate limiting** and/or **bot detection** (e.g. in middleware or API) for `/search` and `/api/search` (and optionally `/api/search/suggestions`) to throttle abusive crawlers.

### 6.3 Prevent bot abuse

- **Rate limiting:** Apply rate limits (e.g. Vercel or middleware) for:
  - `/search` and `/api/search`, `/api/search/suggestions`
  - High-volume routes like `/actors/...`, `/movies/...`, `/rate/...`
- **Robots / crawler hints:** Ensure `robots.txt` and meta robots are aligned with sitemap; consider disallowing or limiting crawl of `/search` if it’s not important for SEO (e.g. `Disallow: /search` or allow only known bots with limits).
- **Logging:** Temporarily log ISR-related runs and suggestions API hits with user-agent (see Section 7) to confirm which routes and user-agents drive the most traffic.

### 6.4 revalidatePath usage

- `revalidatePath('/dashboard')` and `revalidatePath(\`/r/${slug}\`)` on rating submit are reasonable. If dashboard or share pages are hit very frequently by bots, consider slightly longer cache for those routes or rate limiting; the main lever remains rate pages and actor/movie/search.

---

## 7. Temporary Logging Added

The following temporary logging was added to validate the above:

1. **ISR / rate page:** In `src/app/rate/[movieSlug]/[actorSlug]/page.tsx`, a server-side log when the rate page server component runs (so you see when the route is rendered/revalidated). Example:  
   `[ISR] Rate page render /rate/{movieSlug}/{actorSlug}`
2. **Suggestions API:** In `src/app/api/search/suggestions/route.ts`, log each request with user-agent and query. Example:  
   `[Suggestions] { q, userAgent }`
3. **Search API:** In `src/app/api/search/route.ts`, log each full/suggestions request with user-agent and query. Example:  
   `[Search API] { q, suggestions, userAgent }`

After a few days in production, check Vercel logs for `[ISR]` and `[Suggestions]` to confirm which paths and user-agents dominate. Remove or reduce logging once the analysis is done.

---

## 8. Summary Table

| Issue                         | Cause                                                                                            | Change                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **~886k ISR writes**          | Rate pages (ISR) with short revalidate + many URLs in sitemap + crawlers                         | Increase revalidate (e.g. 3600–86400) for rate layout/page; align layout/page.                                                                 |
| **1.6M function invocations** | Search force-dynamic, actor/movie force-dynamic, middleware uncached fetch, client no-store APIs | Remove force-dynamic from actor/movie; use ISR. Optional: static search shell + client fetch; rate limit / bot throttling for search and APIs. |
| **Search “per query”**        | Not ISR; every request is dynamic                                                                | Use client-only search or rate limit to cut invocations.                                                                                       |
| **Bot abuse**                 | Crawlers hitting /search, /actors, /movies, /rate                                                | Rate limiting; optional robots.txt/middleware for /search; logging to confirm.                                                                 |

---

**Conclusion:** The main lever for **ISR writes** is **rate pages**: increase revalidate and optionally align layout/page. For **function invocations**, make **actor and movie pages ISR** (remove force-dynamic) and **throttle or redesign search** (client-only or rate limiting). Sitemap has no query params and is fine; suggestions API is already cached. Temporary logging is in place to verify which route(s) and user-agents cause the most load.

---

## 9. Post-Refactor Summary (Task 4 Safety Checks)

### 9.1 No authenticated/user-specific data cached server-side

- **Actor page:** Server fetches public actor + performances via `/api/actors/[id]` with `next: { revalidate: 3600 }`. User rating and auth-dependent UI are in `ActorPageClient` and fetched client-side with `cache: 'no-store'` (e.g. `/api/actors/${actorId}/user-rating`).
- **Movie page:** Same pattern — public movie/performances from API (ISR); user rating and auth UI in `MoviePageClient` with `cache: 'no-store'`.
- **Rate page:** Server only passes `initialMovie` and `initialActor` (public). Rating form and user state are client-side with no-store where needed.

### 9.2 Dashboard and profile remain dynamic

- `src/app/dashboard/page.tsx`: `export const dynamic = 'force-dynamic'` — unchanged.
- `src/app/profile/page.tsx`: `export const dynamic = 'force-dynamic'` — unchanged.

### 9.3 Search page remains dynamic

- `src/app/search/page.tsx`: `export const dynamic = "force-dynamic"` restored so every `/search` and `/search?q=...` request runs on the server (per safety requirement).

### 9.4 Routes now ISR vs still dynamic

| Route                                                          | Status      | Revalidate      |
| -------------------------------------------------------------- | ----------- | --------------- |
| `/actors/[id]`                                                 | **ISR**     | 3600            |
| `/movies/[slug]`                                               | **ISR**     | 3600            |
| `/rate/[movieSlug]/[actorSlug]`                                | **ISR**     | **86400** (24h) |
| `/r/[slug]`                                                    | **ISR**     | 60              |
| `/search`                                                      | **Dynamic** | —               |
| `/dashboard`, `/profile`, auth, onboarding, performances, etc. | **Dynamic** | —               |

### 9.5 Expected impact

- **ISR writes:** Large drop. Rate pages revalidate at most once per 24h per URL instead of every 5–60 min; actor/movie are ISR so crawler hits get cache HITs instead of triggering revalidation on every request.
- **Function invocations:** Lower for actor and movie (cached 1h) and for middleware (fetch cached 5 min). Search remains dynamic so search traffic still incurs one invocation per request; consider rate limiting or client-only search later if needed.
- **Infrastructure:** Should stabilize under normal crawler load with 24h rate revalidate and 5 min middleware cache.
