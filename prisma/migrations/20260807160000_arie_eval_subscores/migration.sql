-- ARIE eval: sub-scores for labeled validation corpus

ALTER TABLE "AriePreviewEval" ADD COLUMN "scoreRelevance" INTEGER;
ALTER TABLE "AriePreviewEval" ADD COLUMN "scoreInsight" INTEGER;
ALTER TABLE "AriePreviewEval" ADD COLUMN "scoreAccuracy" INTEGER;
ALTER TABLE "AriePreviewEval" ADD COLUMN "scoreBrandVoice" INTEGER;
