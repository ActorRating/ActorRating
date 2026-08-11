-- Separate machineEval for LLM auto-grading (does not touch humanGrade or pipelineResult)

ALTER TABLE "ArieValidationCase" ADD COLUMN "machineEval" JSONB;
ALTER TABLE "ArieValidationCase" ADD COLUMN "machineGradedAt" TIMESTAMP(3);
