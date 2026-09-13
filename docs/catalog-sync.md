# Daily catalog sync (new movies + cast + filmography)

Keeps the DB growing from TMDB without manual admin fetch.

## What it does

Each run:

1. Discovers **now playing**, **upcoming**, and **recent theatrical releases** (last ~14 days)
2. Skips adult / featurette / joke titles and movies already fully ingested (`castIngestedAt` set)
3. For each remaining title (capped per run): full cast ingest + poster/slug metadata
4. Expands **filmography** for newly created **top-billed** actors (creates movie shells + that actor’s credits)
5. Light backfill of incomplete movie shells left over from earlier expansions

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
| `CATALOG_SYNC_MAX_MOVIES` | `12` | Max movies to ingest/sync per run (1–40) |
| `CATALOG_SYNC_MAX_FILMOGRAPHY_ACTORS` | `8` | Max **new** actors to expand filmography for per movie |
| `CATALOG_SYNC_MAX_BILLING_ORDER` | `12` | Only expand new actors with billing order ≤ this |
| `CATALOG_SYNC_INCOMPLETE_TAKE` | `8` | Incomplete shell backfill batch (0 = skip) |
| `CATALOG_SYNC_RECENT_DAYS` | `14` | Discover window for recent releases |
| `CATALOG_SYNC_MIN_POPULARITY` | `3` | Drop very obscure discover hits |

## npm

```bash
npm run catalog:cron
```

## Notes

- Filmography expand creates **movie shells** without full cast; later cron runs + incomplete backfill fill those in.
- Already-ingested titles are skipped so the job stays cheap day-to-day.
- This does **not** re-sync cast for every existing movie every night (by design).
