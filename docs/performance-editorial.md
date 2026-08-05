# Performance editorial (ops)

Unique craft blurbs on indexable `/rate/[movie]/[actor]` pages, generated from **score/community templates** (no OpenAI).

## Env

- `CRON_SECRET` or `EDITORIAL_CRON_SECRET`
- `EDITORIAL_CRON_LIMIT` (optional, default 25)

## Deploy

1. `prisma migrate deploy` (adds `PerformanceEditorial`)
2. Coolify scheduled task (daily): `node scripts/run-performance-editorial-cron.js`

## First batch

After deploy, either:

- Admin → Editorial → **Generate next 10** (repeat), or
- `npm run editorial:generate -- --limit=50`

Human-locked rows are never overwritten by cron. Edit freely in admin for higher-quality copy.
