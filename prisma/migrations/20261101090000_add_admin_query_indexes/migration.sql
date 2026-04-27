-- Performance indexes for admin analytics queries at scale.
-- Created as additive, non-destructive indexes.

CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");

CREATE INDEX IF NOT EXISTS "Rating_createdAt_idx" ON "Rating"("createdAt");
CREATE INDEX IF NOT EXISTS "Rating_userId_idx" ON "Rating"("userId");
