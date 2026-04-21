ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "username" TEXT;

UPDATE "User"
SET "username" = LOWER("username")
WHERE "username" IS NOT NULL;

WITH prepared AS (
  SELECT
    "id",
    LOWER(
      COALESCE(
        NULLIF("username", ''),
        NULLIF(SPLIT_PART("email", '@', 1), ''),
        'user'
      )
    ) AS base_name
  FROM "User"
),
sanitized AS (
  SELECT
    "id",
    CASE
      WHEN LENGTH(REGEXP_REPLACE(base_name, '[^a-z0-9_]+', '_', 'g')) < 3
        THEN RPAD(REGEXP_REPLACE(base_name, '[^a-z0-9_]+', '_', 'g'), 3, '0')
      ELSE REGEXP_REPLACE(base_name, '[^a-z0-9_]+', '_', 'g')
    END AS clean_name
  FROM prepared
),
ranked AS (
  SELECT
    "id",
    clean_name,
    ROW_NUMBER() OVER (PARTITION BY clean_name ORDER BY "id") AS rn
  FROM sanitized
)
UPDATE "User" u
SET "username" = CASE
  WHEN r.rn = 1 THEN r.clean_name
  ELSE r.clean_name || '_' || (r.rn - 1)::TEXT
END
FROM ranked r
WHERE u."id" = r."id";

ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key"
ON "User"("username");
