-- Service Agreement
CREATE TYPE "ServiceAgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TABLE "ServiceAgreement" (
    "id" TEXT NOT NULL,
    "agreementNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PM_PACKAGE',
    "coverage" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "status" "ServiceAgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceAgreement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceAgreement_agreementNo_key" ON "ServiceAgreement"("agreementNo");
CREATE INDEX "ServiceAgreement_customerId_idx" ON "ServiceAgreement"("customerId");
CREATE INDEX "ServiceAgreement_status_idx" ON "ServiceAgreement"("status");
CREATE INDEX "ServiceAgreement_endDate_idx" ON "ServiceAgreement"("endDate");
ALTER TABLE "ServiceAgreement" ADD CONSTRAINT "ServiceAgreement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Spare Parts
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "partNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'EA',
    "costPrice" DECIMAL(12,2),
    "sellPrice" DECIMAL(12,2),
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "reorderAt" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SparePart_partNo_key" ON "SparePart"("partNo");
CREATE INDEX "SparePart_partNo_idx" ON "SparePart"("partNo");

CREATE TABLE "SparePartUsage" (
    "id" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "ticketId" TEXT,
    "rmaId" TEXT,
    "pmId" TEXT,
    "qty" INTEGER NOT NULL,
    "techId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SparePartUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SparePartUsage_sparePartId_idx" ON "SparePartUsage"("sparePartId");
CREATE INDEX "SparePartUsage_ticketId_idx" ON "SparePartUsage"("ticketId");
ALTER TABLE "SparePartUsage" ADD CONSTRAINT "SparePartUsage_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Installation Checklist
CREATE TABLE "InstallChecklist" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "photoKey" TEXT,
    "note" TEXT,
    "checkedAt" TIMESTAMP(3),
    "checkedBy" TEXT,
    CONSTRAINT "InstallChecklist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InstallChecklist_installationId_idx" ON "InstallChecklist"("installationId");

-- User skills
ALTER TABLE "User" ADD COLUMN "skills" TEXT[] DEFAULT '{}';
