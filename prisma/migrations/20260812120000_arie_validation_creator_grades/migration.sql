-- Creator Unlock Sprint — human grading dimensions for draft quality
ALTER TABLE "ArieValidationCase" ADD COLUMN IF NOT EXISTS "scoreTimely" INTEGER;
ALTER TABLE "ArieValidationCase" ADD COLUMN IF NOT EXISTS "scoreNative" INTEGER;
ALTER TABLE "ArieValidationCase" ADD COLUMN IF NOT EXISTS "scoreInteresting" INTEGER;
