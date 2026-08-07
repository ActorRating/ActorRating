-- ARIE Sprint 2: persist Context Packages on opportunities

CREATE TABLE "ArieContextPackage" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT,
    "inboundEventId" TEXT,
    "package" JSONB NOT NULL,
    "builderVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArieContextPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArieContextPackage_opportunityId_key" ON "ArieContextPackage"("opportunityId");
CREATE INDEX "ArieContextPackage_inboundEventId_idx" ON "ArieContextPackage"("inboundEventId");
CREATE INDEX "ArieContextPackage_createdAt_idx" ON "ArieContextPackage"("createdAt");

ALTER TABLE "ArieContextPackage" ADD CONSTRAINT "ArieContextPackage_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "ArieOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
