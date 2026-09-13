# Daily catalog sync (new movies + cast + filmography)

Keeps the DB growing from TMDB without manual admin fetch.

## What it does

Each run has **two tracks**:

### Theatrical (strict)
1. Discovers **now playing** + **recent theatrical releases** (last ~14 days)
2. Quality-filters: **Animation / Family / TV Movie**, popularity ≥ 15, released titles need ≥ 50 votes, cast ≥ 5, runtime ≥ 60m when known
3. Ingests up to **12** titles with full cast + top-billed filmography expand

### Upcoming / festival (relaxed)
1. Discovers TMDB **upcoming** (2 pages) + **future theatrical window** (today → +180 days, 2 pages)
2. Only **future-dated** releases; popularity ≥ **5** (so festival titles like *Wild Horse Nine* can land); **no vote floor**
3. Same genre / cast / runtime gates; capped at **4** titles per run so the long tail doesn’t flood the DB

Then: light backfill of incomplete movie shells from earlier filmography expands.

Rate-limited via existing TMDB helpers (~200ms between calls).

## Coolify Scheduled Task

Daily, e.g. **06:00 UTC** (after journal / editorial is fine):

```bash
node scripts/run-catalog-sync-cron.js
```

Or:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://actorrating.com/api/cron/catalog-sync
```

Requires `CRON_SECRET` (or `EDITORIAL_CRON_SECRET`) and `TMDB_API_KEY` on the app.

Disable with `CATALOG_SYNC_CRON_ENABLED=false`.

## Env knobs (optional)

| Env | Default | Meaning |
|-----|---------|---------|
| `CATALOG_SYNC_REGION` | `US` | TMDB region for now-playing / upcoming |
| `CATALOG_SYNC_MAX_MOVIES` | `12` | Max **theatrical** ingest/sync per run |
| `CATALOG_SYNC_MAX_UPCOMING` | `4` | Max **upcoming/festival** ingest per run (0 = off) |
| `CATALOG_SYNC_MAX_FILMOGRAPHY_ACTORS` | `8` | Max **new** actors to expand filmography for per movie |
| `CATALOG_SYNC_MAX_BILLING_ORDER` | `12` | Only expand new actors with billing order ≤ this |
| `CATALOG_SYNC_INCOMPLETE_TAKE` | `8` | Incomplete shell backfill batch (0 = skip) |
| `CATALOG_SYNC_RECENT_DAYS` | `14` | Discover window for recent releases |
| `CATALOG_SYNC_FUTURE_DAYS` | `180` | Discover window for upcoming/festival |
| `CATALOG_SYNC_MIN_POPULARITY` | `15` | Theatrical popularity floor |
| `CATALOG_SYNC_UPCOMING_MIN_POPULARITY` | `5` | Upcoming/festival popularity floor |
| `CATALOG_SYNC_MIN_VOTE_COUNT` | `50` | Min TMDB votes for **theatrical released** titles |
| `CATALOG_SYNC_MIN_CAST` | `5` | Min credited cast size after TMDB credits fetch |

Blocked genres (always): **Animation (16)**, **Family (10751)**, **TV Movie (10770)**.

## npm

```bash
npm run catalog:cron
```

## Notes

- Filmography expand creates **movie shells** without full cast; later cron runs + incomplete backfill fill those in.
- Already-ingested titles are skipped so the job stays cheap day-to-day.
- This does **not** re-sync cast for every existing movie every night (by design).
- Admin “fetch movie” is unchanged and can still add titles the cron would skip.
- Cron JSON includes `track: "theatrical" | "upcoming"` per movie for debugging.
