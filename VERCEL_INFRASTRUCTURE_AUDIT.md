# Vercel Infrastructure & Cost Audit

**Goal:** Identify infrastructure patterns that unnecessarily increase server execution (Fluid Provisioned Memory, Fluid Active CPU, Function Invocations, ISR Writes) and recommend converting routes to static or ISR where behavior stays correct.

**Constraint:** No code was modified; this is an audit and recommendation document only.

---

## 1. Route audit table

| Route | Current Mode | Why it is dynamic | Can be static/ISR? | Recommended change |
|-------|--------------|-------------------|--------------------|--------------------|
| `/` (home) | (default static) | No dynamic/revalidate export | Yes | Keep as-is (static). |
| `/about` | (default static) | No dynamic export; server component | Yes | Keep as-is. |
| `/oscars-2026` | (default static) | Client component, no export dynamic | Yes | Keep as-is. |
| `/actors/[id]` | `revalidate = 3600` | ISR 1h; slug or ID | — | Keep ISR. Consider 7200–86400 if acceptable. |
| `/actors/[id]/layout` | `revalidate = 3600` | ISR 1h | — | No change. |
| `/actors/<uuid>/page.tsx` (986 routes) | `force-dynamic` | Each static segment is a full client page with force-dynamic | **Yes** | **Remove all 986 folders** and rely on `actors/[id]` (ISR). Redirect UUIDs in `[id]` to same UX or 301. |
| `/movies/[slug]` | `revalidate = 3600` | ISR 1h | — | No change. |
| `/movies/[slug]/layout` | `revalidate = 3600` | ISR 1h | — | No change. |
| `/rate` | `force-dynamic` | Client-only (search params, API calls); no server data | **Yes** | **Static shell.** Remove `dynamic = "force-dynamic"`. Page is client-driven; no need for server dynamic. |
| `/rate/[movieSlug]/[actorSlug]` | `force-static` + `revalidate = 86400` | ISR 24h; unstable_cache | — | Keep as-is. |
| `/rate/[movieSlug]/[actorSlug]/layout` | `revalidate = 86400` | ISR 24h; unstable_cache | — | No change. |
| `/r/[slug]` (share) | `revalidate = 60` | ISR 1 min; unstable_cache | — | Keep. Optionally 300 if 1 min too aggressive. |
| `/performances` | `revalidate = 300` | ISR 5 min; unstable_cache | — | No change. |
| `/performances/[id]` | `force-dynamic` | Single performance detail; client fetches | **Yes** | **ISR.** Remove force-dynamic, add `revalidate = 300` (or 600). User-specific bits stay client. |
| `/search` | `force-dynamic` | Client-only (query in URL, API calls) | **Yes** | **Static shell.** Remove `dynamic = "force-dynamic"`. Results are client-fetched. |
| `/dashboard` | `force-dynamic` | User-specific data (getServerUserId, getDashboardData) | No | Keep dynamic. |
| `/profile` | `force-dynamic` | User-specific (getServerUser) | No | Keep dynamic. |
| `/onboarding` | `force-dynamic` | Client checks user/session | **Yes** | **Static shell.** Remove force-dynamic; redirect/auth in client. |
| `/onboarding/rate` | `force-dynamic` | Client checks user; fetches /api/ratings/me | **Yes** | **Static shell.** Same as above. |
| `/auth/signin` | `force-dynamic` | Static form; no server data per request | **Yes** | **Static.** Remove force-dynamic. |
| `/auth/signup` | `force-dynamic` | Static form | **Yes** | **Static.** Remove force-dynamic. |
| `/auth/callback` | (client, no export) | OAuth callback; client-side redirect logic | — | Keep (no route-level cache). |

### Layouts and route handlers (summary)

- **Root layout** (`src/app/layout.tsx`): No `dynamic` or `revalidate`. Uses `SessionProvider` (client). Does not force dynamic.
- **API route handlers** with explicit config:
  - `api/performances/route.ts`: `dynamic = 'force-dynamic'` — list endpoint; could rely on Cache-Control only and remove force-dynamic to allow edge caching where applicable.
  - `api/performances/by-ids/route.ts`: `dynamic = 'force-dynamic'` — POST by design; dynamic is default for mutations; optional to remove export for clarity.
  - `api/performances/by-lookup/route.ts`: `revalidate = 300` — keep.

---

## 2. Scan summary: five patterns

### 2.1 `dynamic = "force-dynamic"` (or `'force-dynamic'`)

| Location | Type | Recommendation |
|----------|------|----------------|
| `src/app/rate/page.tsx` | Page | Remove; use static shell. |
| `src/app/profile/page.tsx` | Page | Keep (user-specific). |
| `src/app/dashboard/page.tsx` | Page | Keep (user-specific). |
| `src/app/onboarding/page.tsx` | Page | Remove; static shell. |
| `src/app/auth/signup/page.tsx` | Page | Remove; static. |
| `src/app/auth/signin/page.tsx` | Page | Remove; static. |
| `src/app/search/page.tsx` | Page | Remove; static shell. |
| `src/app/performances/[id]/page.tsx` | Page | Replace with ISR: remove force-dynamic, add `revalidate = 300` (or 600). |
| `src/app/actors/<uuid>/page.tsx` (986 files) | Page | Remove all; use only `actors/[id]` (ISR). |
| `src/app/api/performances/route.ts` | API | Consider removing; rely on Cache-Control. |
| `src/app/api/performances/by-ids/route.ts` | API | Optional remove (POST is dynamic by default). |

### 2.2 `export const revalidate`

| Location | Value | Recommendation |
|----------|--------|----------------|
| `src/app/rate/[movieSlug]/[actorSlug]/page.tsx` | 86400 | Keep. |
| `src/app/rate/[movieSlug]/[actorSlug]/layout.tsx` | 86400 | Keep. |
| `src/app/actors/[id]/page.tsx` | 3600 | Keep (or increase to 7200–86400 if freshness OK). |
| `src/app/actors/[id]/layout.tsx` | 3600 | Keep. |
| `src/app/movies/[slug]/page.tsx` | 3600 | Keep. |
| `src/app/movies/[slug]/layout.tsx` | 3600 | Keep. |
| `src/app/r/[slug]/page.tsx` | 60 | Keep (or 300 for fewer ISR writes). |
| `src/app/performances/page.tsx` | 300 | Keep. |
| `src/app/api/performances/by-lookup/route.ts` | 300 | Keep. |

### 2.3 `unstable_cache`

| Location | Key pattern | Revalidate | Recommendation |
|----------|-------------|------------|----------------|
| `src/app/rate/[movieSlug]/[actorSlug]/page.tsx` | `rate-page:${movieSlug}:${actorSlug}` | 86400 | Keep. |
| `src/app/rate/[movieSlug]/[actorSlug]/layout.tsx` | `rate:count:...`, `rate:agg:...` | 86400 | Keep. |
| `src/app/performances/page.tsx` | (internal) | 300 | Keep. |
| `src/app/r/[slug]/page.tsx` | `r:share:${slug}` | 60 | Keep. |

### 2.4 `fetch(..., { cache: 'no-store' })`

All usages are in **client components** or **server contexts that require fresh user data** (e.g. auth callback, dashboard, onboarding). No change recommended for correctness; these are appropriate for user-specific or post-auth flows.

| Location | Context | Recommendation |
|----------|---------|----------------|
| `RatePageClient.tsx` | User ratings | Keep. |
| `MoviePageClient.tsx` | User rating / auth | Keep. |
| `ActorPageClient.tsx` | User rating | Keep. |
| `DashboardClient.tsx` | User data | Keep. |
| `auth/callback/page.tsx` | Post-login | Keep. |
| `onboarding/rate/page.tsx` | User progress | Keep. |
| Components (LevelProgressBar, UserBadges, etc.) | User level | Keep. |

### 2.5 `fetch(..., { next: { revalidate } })`

| Location | Revalidate | Recommendation |
|----------|------------|----------------|
| `rate/[movieSlug]/[actorSlug]/page.tsx` | 86400 | Keep. |
| `rate/[movieSlug]/[actorSlug]/layout.tsx` | 86400 | Keep. |
| `movies/[slug]/page.tsx` | 3600 | Keep. |
| `actors/[id]/page.tsx` | 3600 | Keep. |
| `DashboardClient.tsx` | 0 (always fresh) | Keep for dashboard. |

---

## 3. Focus areas (actor, movie, performance, rate, share, search, dashboard/profile)

- **Actor pages:** Canonical route `actors/[id]` is ISR 1h. **Problem:** 986 extra routes under `actors/<uuid>/` and `actors/<cuid>/` each use `force-dynamic`, so every hit to those paths runs a full server execution. **Fix:** Remove the 986 static segment folders and serve all actor IDs via `actors/[id]` only (already handles UUID via `<ActorPageClient />` when ID is UUID).
- **Movie pages:** Only `movies/[slug]` with ISR 3600. No duplicate force-dynamic movie routes. Middleware runs for `/movies/:slug*` and calls internal API (see API section).
- **Performance pages:** List `/performances` is ISR 300. Detail `/performances/[id]` is force-dynamic; can be switched to ISR 300–600.
- **Rate pages:** Index `rate/page.tsx` is force-dynamic but is client-only → static shell. Slug route `rate/[movieSlug]/[actorSlug]` is already ISR 24h; no change.
- **Share rating `/r/[slug]`:** ISR 60; optional increase to 300 to reduce ISR writes.
- **Search:** `search/page.tsx` is force-dynamic; content is client-driven → static shell.
- **Dashboard/profile:** Correctly dynamic (user-specific).

---

## 4. Unnecessary `force-dynamic` and alternatives

| Page | Reason unnecessary | Preferred alternative |
|------|--------------------|------------------------|
| `rate/page.tsx` | No server data; client uses search params and API | **Static** — remove `dynamic = "force-dynamic"`. |
| `search/page.tsx` | No server data; client uses query and API | **Static** — remove `dynamic = "force-dynamic"`. |
| `auth/signin/page.tsx` | Static form | **Static** — remove. |
| `auth/signup/page.tsx` | Static form | **Static** — remove. |
| `onboarding/page.tsx` | Redirect/auth in client | **Static** — remove. |
| `onboarding/rate/page.tsx` | Same | **Static** — remove. |
| `performances/[id]/page.tsx` | Public performance data; user-specific UI is client | **ISR** — remove force-dynamic, add `revalidate = 300` (or 600). |
| All `actors/<uuid|cuid>/page.tsx` (986) | Duplicate of `actors/[id]`; same data can be served by one ISR route | **Remove routes** — use only `actors/[id]` (ISR). |

---

## 5. Ideal caching values (product-level)

| Route type | Suggested cache | Notes |
|------------|-----------------|--------|
| Actor pages | 1h–24h (3600–86400) | Already 3600; increase if freshness OK. |
| Movie pages | 1h–24h (3600–86400) | Already 3600. |
| Rating share `/r/[slug]` | 1–10 min (60–600) | Currently 60; 300 reduces ISR writes. |
| Rate slug page | 24h (86400) | Keep. |
| Performances list | 5 min (300) | Keep. |
| Performance detail | 5–10 min (300–600) | Add ISR. |
| Dashboard / profile | Dynamic | No cache. |

---

## 6. API routes: expensive patterns

- **Middleware calling internal API:** For every request matching `/actors/:id*` or `/movies/:slug*`, middleware runs and then calls `fetch(origin + '/api/actors/' + id)` or `fetch(origin + '/api/movies/' + slug)` with `next: { revalidate: 300 }`. So each actor/movie page view can trigger: middleware run → API call (actors or movies) → page render (which may call the same API again for slug in `actors/[id]` or `movies/[slug]`). **Recommendation:** Consider moving 410 logic into the page/layout or a single server path to avoid duplicate work; or shorten middleware path (e.g. only run for known bad slugs) to reduce API invocations.
- **Uncached user APIs:** `api/ratings/me`, `api/user/level-progress`, `api/actors/[id]/user-rating`, `api/movies/[id]/user-rating` are correctly uncached (user-specific). No change.
- **Heavy queries:** `api/suggestions/performances` uses multiple Prisma raw queries and has in-memory cache (popular 5 min, trending 2 min). Already optimized; ensure Cache-Control on response is used by clients where applicable.
- **api/performances/route.ts:** GET list with `force-dynamic`. Response has Cache-Control. Removing `export const dynamic = 'force-dynamic'` allows Next to respect Cache-Control and can reduce unnecessary server execution when responses are cached.
- **api/performances/by-ids/route.ts:** POST; dynamic by default. Optional to remove explicit force-dynamic.
- **api/actors/[id]**, **api/movies/[id]:** Both set Cache-Control. Middleware and page fetches may call them repeatedly per request; consolidating 410 + data fetch into one path would reduce duplicate calls.

---

## 7. High Impact Infra Fixes (top 5)

1. **Remove 986 duplicate actor routes (`/actors/<uuid>/` and `/actors/<cuid>/`).**  
   Each is `force-dynamic` and triggers a full server execution. The canonical `actors/[id]` already uses ISR (3600). Serve all actor IDs via `actors/[id]` only (with redirects or same UX for UUIDs). This eliminates up to 986 dynamic route bundles and cuts a large share of function invocations and CPU/memory for actor traffic.

2. **Make rate index and search static (remove `force-dynamic`).**  
   `rate/page.tsx` and `search/page.tsx` are client-driven (params and API calls). Removing `dynamic = "force-dynamic"` turns them into static shells, reducing server runs for two high-traffic entry points.

3. **Make auth and onboarding shells static.**  
   Remove `force-dynamic` from `auth/signin`, `auth/signup`, `onboarding/page.tsx`, and `onboarding/rate/page.tsx`. Forms and redirects are client-side; no per-request server data needed. Reduces invocations on auth and onboarding flows.

4. **Convert `/performances/[id]` to ISR.**  
   Remove `force-dynamic` and add `revalidate = 300` (or 600). Public performance data is cacheable; user-specific UI remains client. Lowers server execution for performance detail views.

5. **Reduce middleware-triggered API calls for actor/movie.**  
   Middleware currently calls `/api/actors/[id]` or `/api/movies/[slug]` for every matched request. Either: (a) limit middleware to paths that really need 410 (e.g. exclude slug-based URLs that are valid), or (b) move 410 logic into the page/layout so the same API call used for rendering also drives 410. This cuts duplicate function invocations (middleware + API + page) per actor/movie view.

---

## 8. Exact recommended changes (no code edits applied)

- **Delete** all page files under `src/app/actors/` that are **not** `[id]/page.tsx` or `[id]/layout.tsx` (i.e. delete every `actors/<uuid>/page.tsx` and `actors/<cuid>/page.tsx`). Ensure `actors/[id]` handles both slug and UUID (it already returns `<ActorPageClient />` for UUID).
- **Remove** from the listed files the line `export const dynamic = "force-dynamic"` (or `'force-dynamic'`):  
  `rate/page.tsx`, `search/page.tsx`, `auth/signin/page.tsx`, `auth/signup/page.tsx`, `onboarding/page.tsx`, `onboarding/rate/page.tsx`.
- **In** `performances/[id]/page.tsx`: remove `export const dynamic = "force-dynamic"` and add `export const revalidate = 300` (or 600).
- **Optional:** In `api/performances/route.ts` remove `export const dynamic = 'force-dynamic'` so Cache-Control can be used without forcing dynamic execution.
- **Optional:** In `r/[slug]/page.tsx` consider increasing `revalidate` from 60 to 300 to reduce ISR writes.
- **Optional:** In `actors/[id]` and `movies/[slug]` consider increasing `revalidate` to 7200 or 86400 if 1h freshness is not required.
- **Optional:** Refactor middleware so it does not call internal actor/movie APIs on every request, or consolidate 410 + data fetch into the page/layout to avoid duplicate API invocations.

This audit is intended to be applied in a follow-up change set; no code was modified in this pass.
