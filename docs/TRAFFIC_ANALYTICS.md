# First-party traffic analytics

How `/admin?tab=traffic` decides what is a human, an unknown client, or a bot — and the
ops steps that are outside the codebase.

## Trust model (three buckets, never "human by default")

| Bucket  | Meaning | How a pageview gets there |
| ------- | ------- | ------------------------- |
| **Human**   | Positive proof | `engaged = true` (server-gated `qualified_visit` wrote back to the row), signed-in `userId`, `dwellMs ≥ 5000` **and** an interaction from the dwell beacon, or the same `visitorId` (`ar_vid`) proved human elsewhere in the window. **Not** by shared IP — that over-counted crawl fleets on CGNAT / humanExempt IPs. Legacy rows without `visitorId` stay Unknown unless the row itself has engaged/dwell/userId. |
| **Unknown** | JS ran, nothing proved | `isLikelyBot = false` and none of the above. Zero-dwell spoofed browsers live here. Not counted as humans anywhere. |
| **Bot**     | Flagged | UA list, header consistency (`ua_hint_mismatch`, `headless_hint`, `missing_sec_fetch`, `cross_site_beacon`, `mobile_hint_mismatch`), client signals (`webdriver`, `zero_screen`), `ip_burst`, crawl heuristics (`crawl_path`, `crawl_entity`, `crawl_fleet`, `crawl_sibling`), Cloudflare verified bot (`cf_verified_bot`), nightly reclassifier (`reclassified_no_engagement`). The reason list is stored in `PageView.botReason` and surfaced in the dashboard. |

Behavioural flags (`crawl_*`, `reclassified_*`) are reversible: when a visitor later proves
human, the pageview route unflags them (`listUnflagableCrawlPageViewIds`).

## Identity & sessions

- `ar_vid` — signed visitor id, 1 year, HttpOnly. `ar_sid` — signed session id, rolling 30-minute
  inactivity window, HttpOnly. Both are set/refreshed by `POST /api/analytics/pageview` and stored
  on `PageView` / `ProductEvent`. Signing (HMAC with `ANALYTICS_IP_SALT` → `AUTH_SECRET`) stops
  clients from minting ids to inflate visitor counts.
- Session trust: Bot if any pageview is bot, else Human if any pageview is human, else Unknown.
- Engaged session (GA4 definition): engaged pageview, or ≥2 pageviews, or ≥10s.
- Bounce (classic): exactly one pageview and no engaged pageview. Shown for Human sessions
  (headline) and for Human+Unknown (what GA/Umami-style tools would show).
- `/admin/*` is excluded from every traffic query.
- **Internal traffic** (admin’s own devices) is also excluded from **writes**: after a
  successful `/admin` visit, the browser gets an HttpOnly `ar_internal=1` cookie (1 year,
  `Path=/`, `SameSite=Lax`). Analytics beacons skip DB storage when that cookie is present
  **or** the Auth.js session email equals `ADMIN_EMAIL`. The cookie is never used for
  authorization. Attribution (`ar_src` / UTM) and visitor/session cookies (`ar_vid` /
  `ar_sid`) are still refreshed on pageview so product flows stay unchanged.

### Debug override (`ar_track=1`)

To record analytics from an internal browser (cookie and/or admin session), open any page
with `?ar_track=1` (e.g. `https://actorrating.com/?ar_track=1`). Client trackers forward
that flag onto beacons as:

- query: `POST /api/analytics/pageview?ar_track=1` (also dwell / event)
- and/or header: `x-ar-track: 1`

When the override is present, storage is **not** skipped. Equivalent: call the beacon URL
directly with `?ar_track=1` or set the header yourself.

### Historical rows (admin `userId`) — read-only inventory

Before deleting or flagging anything, count rows already tied to the admin account:

```sql
-- 1) Resolve admin user id
SELECT id, email FROM "User"
WHERE lower(email) = lower(:admin_email);  -- ADMIN_EMAIL

-- 2) Counts (replace :user_id)
SELECT COUNT(*) AS pageviews_by_userid
FROM "PageView"
WHERE "userId" = :user_id;

SELECT COUNT(*) AS productevents_by_userid
FROM "ProductEvent"
WHERE "userId" = :user_id;

-- Optional: how many of those pageviews would classify as Human on the row alone
SELECT COUNT(*) AS pageviews_row_level_human_proof
FROM "PageView"
WHERE "userId" = :user_id
  AND (
    "engaged" = true
    OR ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
  );
```

**Recommendation (implemented):** admin traffic queries apply a **read-time filter** that drops
`PageView` / `ProductEvent` / `Rating` rows whose `userId` is internal. IDs come from:

- `INTERNAL_USER_IDS` — comma-separated User ids (Coolify env)
- plus the User row whose email equals `ADMIN_EMAIL`

Example Coolify env: `INTERNAL_USER_IDS=cmo6zd0pe000klb0113pehfd2`

Write-skipping (`ar_internal` / admin email) still prevents new rows; the read filter cleans
history in the dashboard without a migration.

## Beacons

| Endpoint | Sent by | Purpose |
| --- | --- | --- |
| `POST /api/analytics/pageview` | `FirstPartyPageViewTracker` (fetch, so Set-Cookie applies) | Creates the row, returns `{ id }`. Body includes `signals` (webdriver, screen, viewport, dpr, timezone, languages, touch points, cores, visibility). Skips the row (still sets cookies) for internal traffic unless `ar_track=1`. |
| `POST /api/analytics/dwell` | `FirstPartyPageViewTracker` on `pagehide` / tab hide / route change (`sendBeacon`) | Raises `dwellMs`, fills `interaction`. Never sets `engaged`. No-op for internal traffic unless overridden. |
| `POST /api/analytics/event` (`qualified_visit` and other ProductEvents) | `QualifiedVisitTracker` / `lib/analytics` | Server-gated; on acceptance sets `engaged = true` on the referenced `pageview_id`. No-op for internal traffic unless overridden. |

All beacon rate limits (`pv`, `pe`, `dw`) go through `checkSharedRateLimit`: Upstash Redis when
`UPSTASH_REDIS_REST_URL/_TOKEN` are set, otherwise a per-process memory window (resets on deploy).

## Ops steps outside the repo

### 1. Migration (required for the new columns)

```
npx prisma migrate deploy
```

Migration `20261103100000_pageview_sessions_and_trust` is additive (new nullable columns + indexes).
Until it runs, the pageview/dwell/event routes will fail their DB writes and fall back to 204
(analytics never breaks the product), so deploy code and migration together.

### 2. Cloudflare → origin headers

The app already reads `cf-connecting-ip` (preferred over the client-controlled first `x-forwarded-for`
entry) and `cf-ipcountry`. The verified-bot flag is **not** sent as a header by default:

- Cloudflare dashboard → Rules → Transform Rules → **Modify Request Header** → Create rule
- Name: `verified-bot-to-origin`
- When: *Custom filter expression* → `(cf.client.bot)`
- Then: *Set static* header `x-cf-verified-bot` = `1`

`cf.client.bot` is available on every plan. Bot score / JA4 fingerprinting need Enterprise and are
not used.

### 3. Traefik trusted IPs (so headers cannot be spoofed by direct-to-origin requests)

Make sure the Traefik entrypoint only trusts forwarded headers from Cloudflare ranges
(`entryPoints.websecure.forwardedHeaders.trustedIPs = [Cloudflare IPv4/IPv6 ranges]`) and that the
origin is not reachable except through Cloudflare (Cloudflare "Authenticated Origin Pulls" or a
firewall allow-list). Otherwise a client hitting the origin directly can forge `cf-connecting-ip`,
`cf-ipcountry` and `x-cf-verified-bot`.

### 4. Nightly reclassifier (Coolify Scheduled Task)

```
node scripts/run-reclassify-pageviews-cron.js        # daily, e.g. 03:30 UTC
```

Flags visitors with ≥5 non-bot pageviews in the last 48h (older than 2h, so beacons settled) and zero
positive signals as `UNIDENTIFIED` / `reclassified_no_engagement`. Preview without writing:
`npx tsx scripts/reclassify-unknown-pageviews.ts --dry`. HTTP alternative:
`GET /api/cron/reclassify-pageviews?secret=$CRON_SECRET[&dry=1]`.

### 5. Optional: Upstash Redis

Set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` so burst / event / dwell rate limits are
shared across replicas and survive deploys.

## What this still cannot do

A bot that runs JavaScript, waits ≥5 s, moves the pointer and scrolls will be counted as human here —
and by GA4, Plausible, Umami and Cloudflare's free tier. The goal of this system is to make the
*unknown* population visible instead of calling it human, and to attribute every bot flag to a reason.
