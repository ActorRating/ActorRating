-- CreateTable
CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(50),
    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WaitlistEntry_email_key" ON "WaitlistEntry"("email");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_createdAt_idx" ON "WaitlistEntry"("createdAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "usedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InviteCode_code_key" ON "InviteCode"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "InviteCode_usedById_key" ON "InviteCode"("usedById");
CREATE INDEX IF NOT EXISTS "InviteCode_ownerId_idx" ON "InviteCode"("ownerId");
CREATE INDEX IF NOT EXISTS "InviteCode_usedAt_idx" ON "InviteCode"("usedAt");

DO $$ BEGIN
  ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_usedById_fkey"
    FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
