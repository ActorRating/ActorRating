-- Read-only investigation: Unknown-class pageviews in the last 24 hours.
-- Unknown = isLikelyBot = false AND no row-level human proof
--   (not engaged, not signed-in, not dwellMs>=5000 with interaction).
-- Visitor-level promotion is omitted here so results match "still looks Unknown"
-- without joining ProductEvent. Run against production with a read-only role.
--
-- ASN / hosting ranges: NOT available. ipHash is one-way SHA-256; we never store
-- the raw IP. Country (cf-ipcountry) is the only geo signal without a new dependency.

-- 0) Volume
SELECT COUNT(*) AS unknown_pageviews_24h
FROM "PageView"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
  AND "path" NOT LIKE '/admin%'
  AND "isLikelyBot" = false
  AND "engaged" = false
  AND "userId" IS NULL
  AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL);

-- 1) Top user agents
SELECT COALESCE(NULLIF(BTRIM("userAgent"), ''), '(empty)') AS user_agent,
       COUNT(*)::bigint AS pageviews,
       COUNT(DISTINCT "ipHash")::bigint AS distinct_ips
FROM "PageView"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
  AND "path" NOT LIKE '/admin%'
  AND "isLikelyBot" = false
  AND "engaged" = false
  AND "userId" IS NULL
  AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
GROUP BY 1
ORDER BY pageviews DESC
LIMIT 25;

-- 2) Distinct IPs + pageviews per IP (top offenders)
SELECT COUNT(DISTINCT "ipHash") AS distinct_ips
FROM "PageView"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
  AND "path" NOT LIKE '/admin%'
  AND "isLikelyBot" = false
  AND "engaged" = false
  AND "userId" IS NULL
  AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL);

SELECT "ipHash",
       COUNT(*)::bigint AS pageviews,
       COUNT(DISTINCT "visitorId")::bigint AS distinct_visitor_ids,
       MIN("createdAt") AS first_seen,
       MAX("createdAt") AS last_seen,
       EXTRACT(EPOCH FROM (MAX("createdAt") - MIN("createdAt"))) AS span_seconds,
       CASE
         WHEN EXTRACT(EPOCH FROM (MAX("createdAt") - MIN("createdAt"))) > 0
         THEN ROUND(
           COUNT(*)::numeric
           / (EXTRACT(EPOCH FROM (MAX("createdAt") - MIN("createdAt"))) / 3600.0),
           2
         )
         ELSE COUNT(*)::numeric
       END AS pageviews_per_hour
FROM "PageView"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
  AND "path" NOT LIKE '/admin%'
  AND "isLikelyBot" = false
  AND "engaged" = false
  AND "userId" IS NULL
  AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
GROUP BY "ipHash"
ORDER BY pageviews DESC
LIMIT 40;

-- 3) Request pace distribution (histogram of pageviews/hour per IP)
WITH per_ip AS (
  SELECT "ipHash",
         COUNT(*)::numeric AS pageviews,
         GREATEST(
           EXTRACT(EPOCH FROM (MAX("createdAt") - MIN("createdAt"))) / 3600.0,
           1.0 / 60.0
         ) AS hours
  FROM "PageView"
  WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    AND "path" NOT LIKE '/admin%'
    AND "isLikelyBot" = false
    AND "engaged" = false
    AND "userId" IS NULL
    AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
  GROUP BY "ipHash"
)
SELECT
  CASE
    WHEN pageviews / hours < 2 THEN 'a) <2 /h'
    WHEN pageviews / hours < 10 THEN 'b) 2–10 /h'
    WHEN pageviews / hours < 60 THEN 'c) 10–60 /h'
    ELSE 'd) ≥60 /h'
  END AS pace_bucket,
  COUNT(*) AS ips,
  SUM(pageviews)::bigint AS pageviews
FROM per_ip
GROUP BY 1
ORDER BY 1;

-- 4) Path share: /rate/ and /actors/
WITH u AS (
  SELECT path
  FROM "PageView"
  WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    AND "path" NOT LIKE '/admin%'
    AND "isLikelyBot" = false
    AND "engaged" = false
    AND "userId" IS NULL
    AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
)
SELECT
  COUNT(*)::bigint AS total,
  COUNT(*) FILTER (WHERE path LIKE '/rate/%')::bigint AS rate_paths,
  COUNT(*) FILTER (WHERE path LIKE '/actors/%')::bigint AS actors_paths,
  ROUND(100.0 * COUNT(*) FILTER (WHERE path LIKE '/rate/%') / NULLIF(COUNT(*), 0), 1) AS rate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE path LIKE '/actors/%') / NULLIF(COUNT(*), 0), 1) AS actors_pct
FROM u;

-- 5) Internal referrer + no prior-cookie proxy
-- Proxy for "no prior ar_vid": visitorId appears only once in the 24h Unknown set
-- for that visitor (first-and-only beacon). Exact cookie state at write time is
-- not stored historically; use this as an upper-bound estimate.
WITH u AS (
  SELECT id, "ipHash", "visitorId", referrer, path, "createdAt"
  FROM "PageView"
  WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    AND "path" NOT LIKE '/admin%'
    AND "isLikelyBot" = false
    AND "engaged" = false
    AND "userId" IS NULL
    AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
),
visitor_counts AS (
  SELECT "visitorId", COUNT(*) AS n
  FROM u
  WHERE "visitorId" IS NOT NULL
  GROUP BY 1
)
SELECT
  COUNT(*)::bigint AS unknown_total,
  COUNT(*) FILTER (
    WHERE referrer ILIKE '%actorrating.com%'
  )::bigint AS internal_referrer,
  COUNT(*) FILTER (
    WHERE referrer ILIKE '%actorrating.com%'
      AND (
        u."visitorId" IS NULL
        OR vc.n = 1
      )
  )::bigint AS internal_ref_and_likely_new_visitor,
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE referrer ILIKE '%actorrating.com%'
        AND (u."visitorId" IS NULL OR vc.n = 1)
    ) / NULLIF(COUNT(*), 0),
    1
  ) AS internal_new_visitor_pct
FROM u
LEFT JOIN visitor_counts vc ON vc."visitorId" = u."visitorId";

-- 6) Country mix (only geo without new deps; ASN impossible from ipHash)
SELECT COALESCE("country", '(none)') AS country,
       COUNT(*)::bigint AS pageviews,
       COUNT(DISTINCT "ipHash")::bigint AS distinct_ips
FROM "PageView"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
  AND "path" NOT LIKE '/admin%'
  AND "isLikelyBot" = false
  AND "engaged" = false
  AND "userId" IS NULL
  AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
GROUP BY 1
ORDER BY pageviews DESC
LIMIT 20;

-- 7) Shape check: one rotating pool vs several scrapers
-- High distinct IPs, low pageviews/IP, high internal-ref share → rotating fleet.
-- Few IPs with high pageviews/hour → dedicated scrapers.
WITH u AS (
  SELECT "ipHash", referrer
  FROM "PageView"
  WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    AND "path" NOT LIKE '/admin%'
    AND "isLikelyBot" = false
    AND "engaged" = false
    AND "userId" IS NULL
    AND NOT ("dwellMs" >= 5000 AND "interaction" IS NOT NULL)
),
per_ip AS (
  SELECT "ipHash", COUNT(*) AS pageviews
  FROM u
  GROUP BY 1
)
SELECT
  (SELECT COUNT(*) FROM u) AS unknown_pageviews,
  (SELECT COUNT(*) FROM per_ip) AS distinct_ips,
  ROUND((SELECT AVG(pageviews) FROM per_ip), 2) AS avg_pv_per_ip,
  ROUND((SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pageviews) FROM per_ip)::numeric, 2) AS median_pv_per_ip,
  (SELECT COUNT(*) FROM per_ip WHERE pageviews = 1) AS ips_with_1_pv,
  (SELECT COUNT(*) FROM per_ip WHERE pageviews >= 20) AS ips_with_20_plus_pv,
  ROUND(
    100.0 * (SELECT COUNT(*) FROM u WHERE referrer ILIKE '%actorrating.com%')
    / NULLIF((SELECT COUNT(*) FROM u), 0),
    1
  ) AS internal_referrer_pct;
