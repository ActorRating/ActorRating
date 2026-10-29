-- =============================================================================
-- PageView retention plan (DO NOT RUN deletes yet — proposal only)
-- Goal: stop ~500k Unknown/Bot rows/month from accumulating forever while
-- keeping Human / engaged decision metrics and recent diagnostic detail.
-- =============================================================================
--
-- Policy (proposed)
-- -----------------
-- 1. Keep ALL raw PageView rows for the last 7 days (diagnostics + bot-suspect).
-- 2. Keep Human-proof rows longer: engaged=true OR userId IS NOT NULL OR
--    (dwellMs>=5000 AND interaction IS NOT NULL) for 90 days (matches prune).
-- 3. After 7 days: aggregate Unknown + Bot into daily buckets by path + trust
--    class, then delete those raw rows.
-- 4. ProductEvent: keep 90 days (funnels); optional separate aggregate later.
-- 5. Existing scripts/prune-pageviews.ts (--days 90) remains the hard ceiling
--    for leftover Human/legacy rows after aggregation.
--
-- New table (migration when approved)
-- -----------------------------------

-- CREATE TABLE "PageViewDailyRollup" (
--   "day"         date NOT NULL,
--   "path"        text NOT NULL,
--   "trustClass"  text NOT NULL,  -- 'UNKNOWN' | 'BOT'
--   "botCategory" text,           -- nullable; NULL for UNKNOWN
--   "pageviews"   integer NOT NULL DEFAULT 0,
--   "distinctIps" integer NOT NULL DEFAULT 0,
--   PRIMARY KEY ("day", "path", "trustClass", "botCategory")
-- );
-- CREATE INDEX "PageViewDailyRollup_day_idx" ON "PageViewDailyRollup" ("day");

-- Preview: how many rows would roll up (Unknown + Bot, older than 7d)
SELECT
  COUNT(*) FILTER (
    WHERE "isLikelyBot" = true
       OR (
         "isLikelyBot" = false
         AND "engaged" = false
         AND "userId" IS NULL
         AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
       )
  ) AS rollup_candidates,
  COUNT(*) FILTER (
    WHERE "engaged" = true
       OR "userId" IS NOT NULL
       OR ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
  ) AS keep_human_proof_rows,
  COUNT(*) AS total_older_than_7d
FROM "PageView"
WHERE "createdAt" < NOW() - INTERVAL '7 days'
  AND "path" NOT LIKE '/admin%';

-- Aggregate insert (idempotent upsert) — dry-run via SELECT first:
SELECT
  ("createdAt" AT TIME ZONE 'UTC')::date AS day,
  "path",
  CASE WHEN "isLikelyBot" THEN 'BOT' ELSE 'UNKNOWN' END AS "trustClass",
  CASE WHEN "isLikelyBot" THEN COALESCE("botCategory"::text, 'UNIDENTIFIED') ELSE NULL END AS "botCategory",
  COUNT(*)::int AS pageviews,
  COUNT(DISTINCT "ipHash")::int AS "distinctIps"
FROM "PageView"
WHERE "createdAt" < NOW() - INTERVAL '7 days'
  AND "createdAt" >= NOW() - INTERVAL '90 days'  -- optional batch window
  AND "path" NOT LIKE '/admin%'
  AND (
    "isLikelyBot" = true
    OR (
      "isLikelyBot" = false
      AND "engaged" = false
      AND "userId" IS NULL
      AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
    )
  )
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC, pageviews DESC
LIMIT 100;

-- When approved, upsert then delete (TRANSACTION — not executed yet):
--
-- BEGIN;
-- INSERT INTO "PageViewDailyRollup" ("day", "path", "trustClass", "botCategory", "pageviews", "distinctIps")
-- SELECT ... (same GROUP BY as above, without LIMIT)
-- ON CONFLICT ("day", "path", "trustClass", "botCategory")
-- DO UPDATE SET
--   "pageviews" = "PageViewDailyRollup"."pageviews" + EXCLUDED."pageviews",
--   "distinctIps" = GREATEST("PageViewDailyRollup"."distinctIps", EXCLUDED."distinctIps");
--   -- Note: distinctIps across batches is approximate; prefer single-pass per day.
--
-- DELETE FROM "PageView"
-- WHERE "createdAt" < NOW() - INTERVAL '7 days'
--   AND "path" NOT LIKE '/admin%'
--   AND (
--     "isLikelyBot" = true
--     OR (
--       "isLikelyBot" = false
--       AND "engaged" = false
--       AND "userId" IS NULL
--       AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
--     )
--   );
-- COMMIT;
--
-- Ops: Coolify daily task after reclassifier, e.g. 04:00 UTC:
--   npx tsx scripts/rollup-pageviews.ts --days-keep 7 --dry
-- then drop --dry once verified.
--
-- Approx savings: if ~500k Unknown+Bot/month and Human proof is a small %,
-- retaining 7d raw (~115k) + rollups (~few thousand rows/month) vs unbounded growth.
