-- Open registration default + anonymous rating identity
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "Rating" ADD COLUMN IF NOT EXISTS "anonId" TEXT;

CREATE INDEX IF NOT EXISTS "Rating_anonId_idx" ON "Rating"("anonId");

-- One rating per anonymous identity per performance (Postgres allows multiple NULL anonId rows).
-- anonId+actorId+movieId mirrors Rating's existing userId+actorId+movieId key and canonical rate URLs.
CREATE UNIQUE INDEX IF NOT EXISTS "Rating_anonId_actorId_movieId_key"
  ON "Rating"("anonId", "actorId", "movieId")
  WHERE "anonId" IS NOT NULL;
