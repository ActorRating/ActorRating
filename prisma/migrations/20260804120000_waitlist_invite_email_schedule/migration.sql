-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN "inviteEmailScheduledFor" TIMESTAMP(3),
ADD COLUMN "inviteEmailSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "WaitlistEntry_inviteEmailScheduledFor_inviteEmailSentAt_idx" ON "WaitlistEntry"("inviteEmailScheduledFor", "inviteEmailSentAt");
