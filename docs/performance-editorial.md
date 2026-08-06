# Performance editorial (ops)

Unique craft blurbs on indexable `/rate/[movie]/[actor]` pages, generated from **score/community templates** (no OpenAI).

## Env

- `CRON_SECRET` or `EDITORIAL_CRON_SECRET`
- `EDITORIAL_CRON_LIMIT` (optional, default 25)

## Deploy

1. `prisma migrate deploy` (adds `PerformanceEditorial`)
2. Coolify scheduled task (daily): `node scripts/run-performance-editorial-cron.js`

## How pages get editorials

1. **Admin (recommended):** `/admin/editorial` → **Generate next 10** or **Generate all cohort 1**  
   Runs one template generate at a time (avoids proxy timeouts). Cohort-1 drain keeps going until the backlog is empty — keep the tab open; Cancel works anytime.
2. **CLI:** `npm run editorial:generate -- --limit=50`
3. **Cron:** nightly batch for missing / `NEEDS_REGEN`

Human-locked rows are never overwritten by cron. Prefer admin generate (paced, with pool-timeout retry). Avoid slamming generate while the site is under heavy crawl load.
