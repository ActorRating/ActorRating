# Performance editorial (ops)

Unique craft blurbs on indexable `/rate/[movie]/[actor]` pages, generated from **score/community templates** (no OpenAI).

## Env

- `CRON_SECRET` or `EDITORIAL_CRON_SECRET`
- `EDITORIAL_CRON_LIMIT` (optional, default 25)

## Deploy

1. `prisma migrate deploy` (adds `PerformanceEditorial`)
2. Coolify scheduled task (daily): `node scripts/run-performance-editorial-cron.js`

## How pages get editorials

1. **Admin (recommended):** `/admin/editorial` → **Generate next 10**  
   Runs one template generate at a time (avoids proxy timeouts) and shows a queue preview + real error text (including “table missing → migrate”).
2. **On demand:** Indexable rate pages missing editorial schedule a deferred template generate via `after()` on visit.
3. **CLI:** `npm run editorial:generate -- --limit=50`
4. **Cron:** nightly batch for missing / `NEEDS_REGEN`

Human-locked rows are never overwritten by cron or deferred generate. Edit freely in admin for higher-quality copy.
