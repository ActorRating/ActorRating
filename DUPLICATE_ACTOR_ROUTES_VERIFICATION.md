# Verification: Duplicate Actor Routes Claim

This document verifies the infrastructure audit claim that **~986 duplicate actor routes** under `/actors/<uuid>/` and `/actors/<cuid>/` exist and use `force-dynamic`, and whether they can be removed safely.

---

## 1. Scan: Every route file under `src/app/actors/`

**Total `page.tsx` files:** **987**

- **1** dynamic route: `src/app/actors/[id]/page.tsx`
- **986** static-segment routes: one `page.tsx` per segment directory

**Sample of the 986 segment routes (first 30 + last 5):**

```
src/app/actors/[id]/page.tsx
src/app/actors/ff3919f4-96f5-4511-b16f-fb7867cd49d5/page.tsx
src/app/actors/fefa4da9-3578-46ce-babc-1398dc0fbb90/page.tsx
src/app/actors/fbb2a397-e1c1-41f0-a185-bdde1ffb05d9/page.tsx
src/app/actors/fb478f56-62f9-4019-ace8-65d00765626f/page.tsx
src/app/actors/fad05b61-2791-4907-850f-3fcacb6b451c/page.tsx
src/app/actors/f982f8c5-f8a4-4a3e-8f39-da4e5cf1c082/page.tsx
... (976 more)
src/app/actors/cmkr6v7jf00hnker591um8ozr/page.tsx
src/app/actors/cmkr6usvz00fpker5x118ok4q/page.tsx
...
src/app/actors/cmko0w18i0000ke3mwc0eb9t9/page.tsx
src/app/actors/cmknzt8130107kewbku15uww1/page.tsx
...
src/app/actors/cmknzlqih01iskencb0nzq2bg/page.tsx
```

**Patterns:**

- **UUID-style:** `[0-9a-f]{8}-[0-9a-f]{4}-...` (e.g. `ff3919f4-96f5-4511-b16f-fb7867cd49d5`) — 46 in the sampled list.
- **CUID-style:** `cmkr...` or `cmko...` (e.g. `cmkr5cor50000ke6r236tix7y`) — many more in the full list.

So there are **986 real route files** (one per segment directory under `src/app/actors/`), plus the single dynamic route `[id]/page.tsx`.

---

## 2. Do the duplicate routes really exist? Do they use `force-dynamic`?

**Yes.**

- **Count:** There are **986** segment directories under `src/app/actors/` (each with a `page.tsx`), confirmed with:
  - `find src/app/actors -name "page.tsx" | wc -l` → **987** (986 segments + 1 `[id]/page.tsx`).
  - `find src/app/actors -mindepth 1 -maxdepth 1 -type d ! -name '[id]' | wc -l` → **986**.

- **`force-dynamic`:** Every checked duplicate page contains:
  - `export const dynamic = "force-dynamic"`
  - `"use client"`
  - A **hardcoded** `actorId = "<uuid or cuid>"` (different per file).

Checked files:

- `src/app/actors/ff3919f4-96f5-4511-b16f-fb7867cd49d5/page.tsx` → `dynamic = "force-dynamic"`, `actorId = "ff3919f4-96f5-4511-b16f-fb7867cd49d5"`.
- `src/app/actors/cmkr5cor50000ke6r236tix7y/page.tsx` → same pattern with CUID.

So the claim is correct: **986 duplicate routes exist, and each uses `force-dynamic`.**

---

## 3. Dynamic route `src/app/actors/[id]/page.tsx`

**Behavior:**

- **Export:** `export const revalidate = 3600` (ISR, 1 hour).
- **Fetches by ID or slug:** For non-UUID `id` it fetches `${baseUrl}/api/actors/${id}` with `next: { revalidate: 3600 }`. The **API** (`/api/actors/[id]/route.ts`) supports both:
  - Lookup by **slug** first (`eq('slug', id)`),
  - Then by **id** (`eq('id', id)`).
  So any actor that has a slug or an id (UUID or CUID) can be resolved by the same API.
- **Supports all actors:** Yes. The single `[id]` route accepts any string segment; the API resolves it by slug or id.
- **UUID special case:** If `id` matches a UUID regex, the page does **not** fetch on the server; it returns `<ActorPageClient />` with no props. The client then gets `actorId` from `useParams().id` and fetches via `/api/actors/${actorId}`.

So the dynamic route already supports all actors (by slug or id); the only difference for UUIDs is that server-side prefetch is skipped and the client loads data.

---

## 4. Are the duplicates unnecessary? Can the site serve all actors via `/actors/[id]` only?

**Summary:**

- **Are the 986 routes real files?** **Yes.** They are 986 real `page.tsx` files in segment directories.
- **Are they “used”?** **Partially.** Next.js would serve them when the path matches the segment name. However, **middleware** changes which requests actually reach them:
  - **Paths that look like a UUID** (e.g. `/actors/ff3919f4-96f5-4511-b16f-fb7867cd49d5`): middleware matches `UUID_REGEX`, then **immediately returns 410 Gone** and never runs the page. So the **UUID duplicate pages are never executed** for those requests.
  - **Paths that are not UUIDs** (e.g. CUIDs like `/actors/cmkr5cor50000ke6r236tix7y`, or slugs like `/actors/heath-ledger`): middleware calls `/api/actors/${id}`; if the API returns OK, the request continues. For CUIDs, Next.js then serves the **duplicate segment page** (e.g. `actors/cmkr5.../page.tsx`), which is force-dynamic. For slugs there is no matching segment folder, so the request is handled by **`[id]/page.tsx`** (ISR).
- **Can the site safely serve all actors through `/actors/[id]` only?** **Yes.** The API already resolves by slug or id. `[id]/page.tsx` already handles slug (server fetch + initial data) and UUID (client-only fetch via `ActorPageClient` with `params.id`). So removing the 986 segment routes and relying only on `[id]` would not require new server data logic; only routing and middleware need to be consistent.

**If the 986 segment routes were deleted:**

1. **Slug URLs** (e.g. `/actors/heath-ledger`): Already served by `[id]` today (no segment folder for slugs). No change.
2. **CUID URLs** (e.g. `/actors/cmkr5cor50000ke6r236tix7y`): Would no longer match a segment folder; Next would route to `[id]` with `id = "cmkr5cor50000ke6r236tix7y"`. That is not a UUID, so the page would fetch from `/api/actors/cmkr5...` on the server and pass initial data to `ActorPageClient`. Behavior would match the current slug flow (server prefetch + ISR).
3. **UUID URLs** (e.g. `/actors/ff3919f4-96f5-4511-b16f-fb7867cd49d5`): Today middleware returns **410** before any page runs. After deletion, the same URL would hit `[id]` with `id = "<uuid>"`. The page would render `<ActorPageClient />` (no props) and the client would fetch by `params.id`. So the **page** would work; the only blocker is middleware currently returning 410 for all UUID paths. To “safely” serve all actors via `[id]` only, middleware should be updated so it does not return 410 for UUIDs without checking existence (e.g. call the same API and return 410 only when the actor is not found).

**Conclusion:** The 986 duplicate routes are redundant with `[id]`. The site can safely serve all actors through `/actors/[id]` only, provided middleware is adjusted so UUID paths are not unconditionally 410’d.

---

## 5. Infra impact if duplicate routes are removed

**Rough estimates:**

- **Dynamic server renders that disappear:** Today, every request that reaches one of the 986 segment pages triggers a **force-dynamic** server render. After removal, only the dynamic route `[id]` runs. For CUID (and any non-UUID, non-slug) actor URLs that currently hit a segment page, each such request today = 1 dynamic render; after removal = 1 ISR-backed render (or cache hit). So **per request to a former segment URL**, you go from “always dynamic” to “ISR or cached.” The **number of such requests** depends on traffic; the **number of distinct code paths** that can trigger dynamic renders drops by **986** (no more 986 segment pages).
- **Fluid Memory / CPU:** Any request that would have hit a segment page today uses a full server execution (Fluid Memory + CPU). After removal, the same URL is served by `[id]` with `revalidate = 3600`, so:
  - Many requests become cache hits (no server run).
  - When a revalidation runs, it’s one shared `[id]` route, not 986 different segment bundles.

So:

- **Dynamic server renders:** Eliminate up to **100% of the renders that currently go to the 986 segment pages** (for CUID/non-slug actor URLs). Exact reduction = (traffic to those segment URLs) × (1 − cache hit rate for `[id]`). If a large share of actor traffic is to CUID or UUID-style URLs that currently hit segments (or would after fixing middleware), the drop in dynamic renders can be large.
- **Fluid Memory / CPU:** Same traffic no longer triggers 986 different force-dynamic pages; it triggers at most one ISR route with caching. You can expect a **substantial reduction** in provisioned memory and CPU for that traffic (order of magnitude: tens of percent to much more, depending on what fraction of total traffic these routes represent).

**Caveat:** UUID actor URLs currently get 410 from middleware, so they do not run any of the 986 pages today. The big win is from CUID (and any other non-UUID segment) traffic moving from 986 force-dynamic pages to one ISR route.

---

## 6. No code changes in this step

No code was modified. This document only records the verification and impact assessment so you can confirm the situation before implementing the audit’s recommended changes (removing the 986 segment routes and adjusting middleware for UUID paths as needed).
