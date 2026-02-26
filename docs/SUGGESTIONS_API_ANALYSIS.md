# Search Suggestions API — Performance & Cost Analysis

**Scope:** `/api/search/suggestions` only.  
**Context:** Vercel Pro serverless, ~208k actors, ~27k movies, PostgreSQL + GIN/btree, Redis + in-memory cache, 300ms debounce, query length ≥ 2.

---

## 1. Problem analysis

### Why the first request is ~3 seconds (DB is ~50ms)

| Component | Estimated time | Notes |
|-----------|----------------|-------|
| **Cold start (Node + route)** | ~1.0–2.0 s | Next.js route bootstrap, module resolution, handler load. Vercel bytecode caching helps but does not eliminate this. |
| **Prisma client init** | ~200–600 ms | First use: load `@prisma/client`, generate/load query engine, create connection pool. You use `globalForPrisma` so only the first invocation in a new instance pays this. |
| **Upstash Redis first request** | ~50–200 ms | First `cacheGet`: HTTP client init + TLS + REST call. `getRedis()` lazy-inits the client. |
| **Redis GET (cache miss)** | ~30–80 ms | Single round-trip. |
| **PostgreSQL (2–6 queries)** | ~50 ms (measured) | Prefix + optional token + optional similarity for actors and movies. Well indexed. |
| **JSON serialize + response** | &lt;10 ms | Negligible. |

**Conclusion:** The ~3 s is dominated by **serverless cold start** (Node + Prisma + Redis initialization). DB time is already low (~50 ms). So the bottleneck is **not** the database but **first-request initialization** in a new function instance.

### What makes it worse

- **Low traffic / many unique queries:** More cold starts, fewer warm hits.
- **Redis before DB:** You always do `cacheGet` before DB. On a cold instance that’s init + round-trip; if miss, then full DB. So cold path = init + Redis + DB.
- **Heavy dependencies:** Prisma is a large dependency; first import and engine load add to cold start.

### What already helps

- In-memory cache (5 min TTL): Repeat identical queries in the same instance are instant.
- Redis: Shared across instances; repeat queries from other instances are fast after first fill.
- Early exit for `q.length < 2`, debounce 300 ms, query ≥ 2: Fewer invocations and fewer wasted DB/Redis calls.

---

## 2. Immediate fixes / small changes

### 2.1 Add timing breakdown in logs (confirm hypothesis)

You already log `Suggestions query time` and `actors=...ms movies=...ms`. Add one more split so you can see “time until first await” (cold start proxy) vs “time in Redis + DB”:

```ts
// At start of GET, after parsing q:
const t0 = Date.now()
// ... early exit, normalize, in-memory check ...
const tAfterSync = Date.now()
const cached = await cacheGet<SuggestionsResponse>(cacheKey)
const tAfterRedis = Date.now()
// If cached, return; else DB...
// Log: coldStartProxy=tAfterSync-t0 redisMs=tAfterRedis-tAfterSync ...
```

**Goal:** Confirm that most of the 3 s is before/around first `await` (cold start + Redis init), not in DB.

### 2.2 Reduce Redis round-trip on cold path

Today: every cache miss does one `cacheGet`. Option: **skip Redis on first request from a new instance** and go straight to DB; then write to both in-memory and Redis. That saves one round-trip on the cold path when Redis would miss anyway. Trade-off: first request for a given query in a new instance always hits DB (same as today on miss), but you avoid waiting on Redis to tell you it’s a miss.

Implementation idea: use a module-level “hasWarmedRedis” flag. First request in the instance: set flag false, skip `cacheGet`, run DB, then set flag true and do `cacheSet`. Subsequent requests: use existing flow (in-memory → Redis → DB). Optional and only worth it if logs show Redis miss on cold path is a big part of the 3 s.

### 2.3 Keep function small and dependencies minimal

- Ensure the suggestions route is in a **separate bundle** from the heaviest parts of the app (e.g. avoid importing Prisma in a barrel that pulls in unrelated code). Next.js already code-splits by route; avoid adding heavy imports to this route.
- You already use `prisma` from a singleton; keep it that way so Prisma is only initialized once per instance.

### 2.4 Stale-while-revalidate from CDN

You send `Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=120`. Vercel Edge caches the response. So **repeat requests for the same query from the same region** can be served from the edge without hitting the function at all. No code change; ensure you’re not sending `Vary` or other headers that restrict caching for normal users. Bot traffic can still hit the origin; see §6.

---

## 3. Medium-term: Edge runtime vs external search

### 3.1 Edge runtime for `/api/search/suggestions`

**Idea:** Run this route on Vercel Edge (lightweight runtime) to reduce cold start. Edge has no Node, so you **cannot use Prisma or the current PostgreSQL driver** in the Edge function.

**Options:**

| Approach | Pros | Cons |
|----------|------|------|
| **Edge + Redis only** | Very fast cold start (~50–200 ms). Same Redis cache. | Cache miss: you cannot run SQL. Must return “no results” or call back to a Node API that does DB (adds latency and complexity). |
| **Edge + external search API** | Edge stays small; search service (e.g. Algolia, Meilisearch, TypeSense) is fast. | Cost, operational complexity, data sync (actors/movies → search index). |
| **Keep Node, add Edge in front** | No change to current API. | Edge can’t “run” the Node function; it only routes. So no cold start improvement from moving to Edge. |

**Feasibility:** Moving the **current** implementation (Prisma + raw SQL) to Edge is **not** feasible without replacing the DB layer. Prisma and `pg` are Node-only.

**Reasonable Edge path:**  
- **Option A:** Edge handler that **only** checks Redis (e.g. Upstash Redis from Edge). On cache hit, return. On cache miss, either return empty and rely on client to retry or on a background job to warm cache, or **proxy** to a Node API route that does DB and then caches.  
- **Option B:** Introduce a dedicated search engine (see §3.2) and call it from an Edge function (HTTP). Then the Edge function has no Prisma, minimal cold start.

### 3.2 Dedicated search engine (Algolia, Meilisearch, TypeSense, etc.)

- **Pros:** Sub-50 ms search, typo tolerance, facets, no DB load. Edge can call the search API over HTTP.  
- **Cons:** Cost, index sync (batch or real-time), need to keep actors/movies in sync.  
- **Vercel:** Fits within Pro; you’d add an HTTP client in the route (Node or Edge). No change to Vercel plan limits for the suggestions endpoint itself.

### 3.3 Recommendation (medium-term)

- If you want to **stay on PostgreSQL only** and improve first-request time: keep Node; focus on warming (see §5) and CDN; accept that first request in a cold instance will stay ~1–2 s until Vercel/Node cold start improves further.  
- If you want **sub-500 ms first request** for suggestions: either **Edge + Redis-only** (cache miss returns empty or triggers a Node backend that fills cache) or **Edge + search engine**. The latter is the only way to get both low cold start and good results on cache miss.

---

## 4. Long-term improvements

- **Warm instances:** Use a cron (e.g. Vercel Cron) or a “keep-warm” ping to hit a cheap endpoint (or the suggestions endpoint with a common query) every few minutes so at least one instance stays warm. Reduces probability of cold start for real users.  
- **Search engine:** Move autocomplete to Algolia/Meilisearch/TypeSense with sync from Postgres; run suggestions API on Edge calling that engine.  
- **Precomputed prefix API:** Offline job builds prefix → top N actor/movie IDs; store in Redis or in a static JSON/edge-readable store. API (Node or Edge) is a lookup only. Requires pipeline and invalidation when data changes.  
- **Client-side index:** For a subset of “top” actors/movies (e.g. 5–10k), ship a compressed trie or Fuse.js-style index to the client; instant suggestions for that subset, fallback to API for the rest. Reduces server load and improves perceived performance for popular queries.

---

## 5. Implementation steps (prioritized)

1. **Logging (this week)**  
   - Add timing breakdown: time to first await, Redis duration, DB duration.  
   - Log `x-vercel-id` or similar if available to correlate cold vs warm.  
   - Keep existing `[Suggestions]` log with `q` and `userAgent` for bot analysis.

2. **Confirm caching behavior**  
   - In production, verify `s-maxage=60` and `stale-while-revalidate=120` by checking response headers from a second request (same query). Ensure the second request is a CDN hit when appropriate.

3. **Optional: skip Redis on suspected cold**  
   - If logs show that on cold start Redis almost always misses, consider “first request in instance” heuristic: skip `cacheGet`, run DB, then `cacheSet` + in-memory. Saves one round-trip on cold miss.

4. **Warming (medium-term)**  
   - Add a Vercel Cron (e.g. every 5 min) that GETs `/api/search/suggestions?q=john` (or a few popular queries). Keeps one instance warm; reduces chance of user hitting cold start.

5. **Bot / abuse (see §6)**  
   - Add rate limiting or bot detection for `/api/search/suggestions` (e.g. by IP or fingerprint) so heavy bot traffic doesn’t cause extra cold starts and cost.

6. **Edge or search engine (only if needed)**  
   - Evaluate Edge + Redis-only vs Edge + search engine based on product needs and budget; implement in a separate branch and measure.

---

## 6. Logging & monitoring for bots and cost

### 6.1 What to log (you already log most)

- **Query and User-Agent** (already in place): `[Suggestions] { q, userAgent }`.  
- **Timing:** `Suggestions query time` and breakdown (sync vs Redis vs DB).  
- **Optional:** Request ID (e.g. `x-vercel-id`), so you can correlate with Vercel dashboard.

### 6.2 How to detect heavy bot use

- **Vercel Analytics / Logs:** Filter by path `/api/search/suggestions` and look at requests per minute, IP diversity, and User-Agent patterns (e.g. many requests with same or empty UA, or known crawler UAs).  
- **Aggregate in your logging:** Count by IP or by `userAgent` over a window; alert if requests per IP or per UA spike (e.g. >100/min per IP).  
- **Response headers:** You already send `Cache-Control`. If most traffic is cacheable, CDN hits won’t show up as function invocations; only cache misses (e.g. many unique queries or bypassing CDN) will.

### 6.3 Reducing cost from bots

- **Rate limit:** Per IP or per API key (if you add one for internal clients). Vercel Pro allows middleware; you can rate-limit in middleware or inside the route (e.g. with Upstash Rate Limit).  
- **Bot detection:** In middleware or in the route, check `user-agent` and known bot patterns; return 200 with empty suggestions or 429 for suspected bots.  
- **CORS and referrer:** Optional: only allow requests from your domain; can block some scrapers.

---

## 7. Cost implications (Vercel Pro)

- **Invocations:** Each request to `/api/search/suggestions` that reaches the function (after CDN) = one invocation. Cached responses at CDN do not count as function invocations. In-memory and Redis caches reduce DB work but not invocation count unless the response is served from CDN.  
- **Execution time:** Billed by GB-s. Cold start adds to duration; so reducing cold start (or avoiding it via warming) reduces average duration and can reduce cost.  
- **Memory:** Pro plan has limits; your function is not especially heavy. Keeping the route lean (no extra large imports) helps.  
- **Redis (Upstash):** Separate from Vercel; cost depends on commands and key size. Current usage (one GET per cache miss, one SET per new result) is modest.

**Summary:** Biggest cost lever is **fewer invocations** (CDN cache, rate limiting, bot filtering) and **shorter duration** (warm instances, fewer cold starts). Moving to Edge would change invocation cost (Edge pricing) and usually reduce duration per request.

---

## 8. Caveats and warnings

- **In-memory cache:** Per-instance. Each new instance has an empty map. So “first request per query per instance” still pays full cost; in-memory helps only for repeated same query in the same instance.  
- **Edge + Redis only:** If you implement “Edge with Redis only”, cache misses must be handled (e.g. return empty, or call Node to backfill). Users might see empty suggestions once per query until cache is filled.  
- **Prisma on Edge:** Do not try to use Prisma or `pg` on Edge; they are not supported. Any Edge solution for this route must use HTTP to Postgres (e.g. via a Node API) or an external search service.  
- **Warming:** A cron that hits the API can consume invocations and may be rate-limited; use a small number of requests (e.g. one or two popular queries every 5 minutes).  
- **Stale-while-revalidate:** Users might see stale suggestions for up to 2 minutes (120 s) in exchange for fast responses. If you need fresher data, reduce `stale-while-revalidate` or use on-demand revalidation.

---

## Summary table

| Goal | Action | Impact |
|------|--------|--------|
| Confirm cause of ~3 s | Add timing breakdown (sync / Redis / DB) and log | Validates cold start hypothesis |
| Fewer cold starts | Cron warming with 1–2 popular queries | Fewer users hit cold instance |
| Fewer invocations | Rely on CDN (existing Cache-Control) + rate limit / bot filter | Lower cost, less abuse |
| First request &lt;500 ms | Edge + Redis-only or Edge + search engine | Requires architecture change |
| No architecture change | Keep Node; optimize logging, warming, rate limit | First request still ~1–2 s when cold |

This document focuses only on `/api/search/suggestions` performance and costs; other APIs and pages are out of scope.
