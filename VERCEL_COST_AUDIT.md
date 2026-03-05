# Vercel Cost Optimization Audit

**Current pain:** High Fluid Provisioned Memory (1.2K GB-Hrs), 2M+ ISR Writes, 3.6M function invocations, 36h active CPU.

**Goal:** Reduce cost by fixing per-rating revalidation, lowering memory, and converting dynamic routes to ISR where safe. No changes yet — audit only; implementation follows in code.

---

## Section 1: Detected Problems (file + explanation)

### 1.1 Per-rating revalidation (ISR writes + cascades)

| File | Problem |
|------|--------|
| `src/app/api/ratings/route.ts` | On every **POST** (create rating) success: `revalidatePath('/dashboard')`. **One rating = 1+ ISR invalidation.** |
| `src/app/api/ratings/[id]/route.ts` | On every **PUT** (update rating) success: calls `revalidatePath(\`/r/${slug}\`)`, `revalidatePath('/dashboard')`, `revalidatePath('/api/user/ratings')`, then **the same three again** inside a try/catch. **One update = up to 6 path revalidations** (duplicate block). Each can trigger cache invalidation / ISR writes. |

**Impact:** Every rating create/update triggers full path revalidation. At scale this directly drives ISR write volume. Rating submissions must **not** trigger full page rebuilds on every submit (per requirement).

---

### 1.2 No explicit memory limit (default 1024 MB)

| File | Problem |
|------|--------|
| `vercel.json` | `functions` only sets `maxDuration: 30` for `src/app/api/**/*.ts`. **No `memory`** → Vercel uses default (typically 1024 MB). All API routes provision 1 GB each → high GB-Hrs. |

---

### 1.3 Dynamic rendering where static/ISR would work

| File | Problem |
|------|--------|
| `src/app/dashboard/page.tsx` | `export const dynamic = 'force-dynamic'`. Every dashboard visit runs server + DB. For early-stage, **revalidate: 600** (10 min) + client refetch after rating is acceptable. |
| `src/app/profile/page.tsx` | Same — `force-dynamic`. Can use **revalidate: 600** and rely on client for freshness after edits. |
| `src/app/rate/page.tsx` | `force-dynamic` on rate index. Could use **revalidate: 600** so the shell is ISR; form still uses API. |
| `src/app/performances/page.tsx` | `force-dynamic` but data already comes from `unstable_cache(..., { revalidate: 300 })`. Page could use **revalidate: 300** so the route is ISR. |
| `src/app/search/page.tsx` | `force-dynamic` — every `/search` and `?q=...` = server run. **Left as-is** per existing safety/product requirement; optional later: static shell + client fetch. |
| **986+** `src/app/actors/<uuid>/page.tsx` | Each is a **client component** with `export const dynamic = "force-dynamic"`. Segment config still applies: every request to `/actors/<uuid>` runs the server. With many UUIDs in sitemap/crawls this multiplies function invocations. **Structural fix:** Prefer single `actors/[id]/page.tsx` (already ISR with revalidate 3600) and remove or redirect UUID static folders so one dynamic route handles all. |

---

### 1.4 cache: 'no-store' and no-store fetches

| File | Problem |
|------|--------|
| `src/app/dashboard/DashboardClient.tsx` | Fetches `/api/ratings/me` and dashboard data with `cache: 'no-store'` and `next: { revalidate: 0 }`. Ensures fresh data but every load = API invocation. Acceptable for user-specific data; keep but ensure we don’t double-invalidate via revalidatePath. |
| `src/app/actors/[id]/ActorPageClient.tsx` | User-rating and actor fetch with no-store. User part is correct; public actor data could use short revalidate from API (already has Cache-Control on API). |
| `src/app/movies/[slug]/MoviePageClient.tsx` | Same pattern. |
| Multiple components | `PerformanceRatingClientWrapper`, `LevelProgressBar`, `UserProgressBar`, `UserBadges`, `LevelBadge`, `ActorRatingSection`, onboarding, auth callback: all use `cache: 'no-store'` for user-specific APIs. **No change** for auth/user data; reduces cache hits but required for correctness. |

---

### 1.5 Middleware: fetch per actor/movie request

| File | Problem |
|------|--------|
| `middleware.ts` | For every `/actors/[id]` and `/movies/[slug]` (non-UUID actor id), middleware does `fetch(origin + /api/actors/:id)` or `.../api/movies/:slug` with `next: { revalidate: 300 }`. So **every actor/movie page view = middleware + 1 API call**. Not uncached (revalidate 300) but still **2 invocations per page view**. Optional later: edge cache or short TTL for existence check to reduce API calls. |

---

### 1.6 Share page revalidation on every rating update

| File | Problem |
|------|--------|
| `src/app/r/[slug]/page.tsx` | Uses `revalidate: 60`. When `api/ratings/[id]` calls `revalidatePath(\`/r/${slug}\`)` on **every** rating update, that share page is invalidated → ISR write. So **every rating update = at least one ISR write for /r/[slug]** plus dashboard. |

---

## Section 2: Cost impact of each issue

| Issue | Primary cost | Effect |
|-------|-------------|--------|
| Per-rating revalidatePath (create + update) | **ISR writes**, some CPU | 2M+ ISR writes likely driven by rate-page crawls + **per-rating revalidation**. Removing per-rating revalidatePath cuts ISR writes from rating activity. |
| revalidatePath in ratings/[id] (6 paths, duplicate block) | **ISR writes**, extra work | Multiplies invalidation per update; fixing duplicate and removing per-rating revalidation reduces writes and CPU. |
| Default 1024 MB for API routes | **GB-Hrs (Fluid Provisioned Memory)** | 1.2K GB-Hrs. Setting **memory: 256** for API routes (where safe) can cut memory cost significantly (e.g. ~4× lower GB-Hrs for those routes). |
| force-dynamic on dashboard, profile, rate index, performances | **Function invocations**, CPU | Every visit = server run. Switching to **revalidate: 600** (or 300 for performances) reduces invocations and CPU for those routes. |
| 986+ actor UUID pages with force-dynamic | **Function invocations**, CPU | Each crawl/hit to `/actors/<uuid>` = server. Consolidating to `actors/[id]` with ISR reduces invocations. |
| Middleware fetch per actor/movie | **Function invocations** | 2 runs per page view (middleware + API). Optional: cache existence check to reduce API calls. |
| cache: 'no-store' on user APIs | **Function invocations** | Necessary for correctness; no change recommended. |

---

## Section 3: Exact code modifications required

### 3.1 Remove per-rating revalidation

- **`src/app/api/ratings/route.ts`**
  - Remove: `import { revalidatePath } from "next/cache"`.
  - Remove: the block `try { revalidatePath('/dashboard') } catch (e) { ... }` after successful create/update.
  - Rely on: client-side state update after submit; optional time-based revalidation on dashboard (e.g. revalidate: 600) so dashboard refreshes every 10 min without per-rating invalidation.

- **`src/app/api/ratings/[id]/route.ts`**
  - Remove: `import { revalidatePath } from "next/cache"`.
  - Remove: all `revalidatePath(...)` calls after PUT success (the block that does `/r/${slug}`, `/dashboard`, `/api/user/ratings` and the duplicate try/catch).
  - Do **not** add new revalidatePath on rating submit. Share page already has `revalidate: 60`; dashboard can use revalidate on the page.

### 3.2 Lower memory allocation to 256 MB for API routes

- **`vercel.json`**
  - Under `functions["src/app/api/**/*.ts"]` add: `"memory": 256`.
  - Keep `maxDuration: 30` unless specific routes need more (e.g. heavy Prisma/export); those can be overridden in route config if needed.

### 3.3 Convert dynamic pages to static with revalidate (where safe)

- **`src/app/dashboard/page.tsx`**
  - **Leave `force-dynamic`.** Dashboard is user-specific (getServerUserId, getDashboardData(userId)); ISR would serve one user’s cached data to others.

- **`src/app/profile/page.tsx`**
  - **Leave `force-dynamic`.** Profile is user-specific (getServerUser, redirect if no user).

- **`src/app/rate/page.tsx`**
  - Replace `export const dynamic = "force-dynamic"` with `export const revalidate = 600`. Rate form is client-side; shell can be ISR.

- **`src/app/performances/page.tsx`**
  - Replace `export const dynamic = "force-dynamic"` with `export const revalidate = 300` to align with existing `unstable_cache(..., { revalidate: 300 })`.

- **`src/app/search/page.tsx`**
  - **No change** (keep force-dynamic per product/safety requirement).

- **Actor UUID static folders**
  - **Not changed in this pass.** Structural fix: eventually use only `actors/[id]` (ISR revalidate 3600) and remove or redirect the 986+ `actors/<uuid>/page.tsx` files so one route handles all. Can be a follow-up.

### 3.4 Fix duplicate revalidatePath block in api/ratings/[id]/route.ts

- Remove the **duplicate** try/catch that calls `revalidatePath` again (same three paths). Before removing all revalidatePath, this would have reduced redundant work; after 3.1 the whole revalidatePath block is removed.

---

## Section 4: Expected reduction (GB-Hrs, ISR writes, invocations, CPU)

| Metric | Before (indicative) | After (expected) |
|--------|---------------------|------------------|
| **Fluid Provisioned Memory (GB-Hrs)** | ~1.2K | **~300–400** (API routes at 256 MB; page routes unchanged unless we add route-level overrides). Assumes majority of GB-Hrs from API. |
| **ISR writes** | 2M+ | **Material drop** by removing per-rating revalidatePath (no invalidation on every create/update). Remaining ISR from rate pages and /r/[slug] time-based only (e.g. 60s, 24h). Estimate: **~50–70% reduction** depending on rating volume. |
| **Function invocations** | 3.6M | **~10–20%** from dashboard/profile/rate index/performances becoming ISR (fewer server runs per view). Larger gain if actor UUID pages are later consolidated. |
| **Active CPU (36h)** | 36h | **Lower** from fewer invocations and less revalidation work; no per-rating revalidatePath reduces CPU per rating. |

---

## Implementation order (as requested)

1. **Remove per-rating revalidation** (api/ratings + api/ratings/[id]).
2. **Set API route memory to 256 MB** in vercel.json.
3. **Convert dashboard, profile, rate index, performances** to static with revalidate (600 or 300).

**Implementation summary (done):**

- Removed all per-rating `revalidatePath` from `api/ratings/route.ts` and `api/ratings/[id]/route.ts`.
- Set `memory: 256` for `src/app/api/**/*.ts` in `vercel.json`.
- Set `revalidate: 600` on `src/app/rate/page.tsx` (client-only shell; safe to cache).
- Set `revalidate: 300` on `src/app/performances/page.tsx` (data is public and already cached with unstable_cache).
- Dashboard and profile left as `force-dynamic` (user-specific).

Optional follow-ups (not in this implementation):

- Consolidate actor UUID routes to single `actors/[id]` and remove static UUID page folders.
- Middleware: cache existence check for actor/movie to reduce API calls.
- Search: static shell + client-side API for queries (if product allows).
