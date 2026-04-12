-- CreateEnum
CREATE TYPE "RmaStage" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'INSPECTING', 'REFUNDED', 'REPLACED', 'REFURBISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RmaReason" AS ENUM ('DOA', 'DEFECT', 'WRONG_ITEM', 'CUSTOMER_CHANGE_MIND', 'WARRANTY_CLAIM', 'OTHER');

-- CreateEnum
CREATE TYPE "RmaResolution" AS ENUM ('REFUND', 'REPLACE', 'REFURBISH', 'REJECTED');

-- CreateTable
CREATE TABLE "Rma" (
    "id" TEXT NOT NULL,
    "rmaNo" TEXT NOT NULL,
    "businessKey" TEXT,
    "customerId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "soId" TEXT,
    "reason" "RmaReason" NOT NULL,
    "description" TEXT NOT NULL,
    "stage" "RmaStage" NOT NULL DEFAULT 'REQUESTED',
    "resolution" "RmaResolution",
    "pickupAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "inspectedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "refundAmount" DECIMAL(12,2),
    "replacementAssetId" TEXT,
    "techId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmaEvent" (
    "id" TEXT NOT NULL,
    "rmaId" TEXT NOT NULL,
    "stage" "RmaStage" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RmaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rma_rmaNo_key" ON "Rma"("rmaNo");

-- CreateIndex
CREATE INDEX "Rma_customerId_idx" ON "Rma"("customerId");

-- CreateIndex
CREATE INDEX "Rma_assetId_idx" ON "Rma"("assetId");

-- CreateIndex
CREATE INDEX "Rma_stage_idx" ON "Rma"("stage");

-- CreateIndex
CREATE INDEX "RmaEvent_rmaId_idx" ON "RmaEvent"("rmaId");

-- AddForeignKey
ALTER TABLE "Rma" ADD CONSTRAINT "Rma_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rma" ADD CONSTRAINT "Rma_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rma" ADD CONSTRAINT "Rma_techId_fkey" FOREIGN KEY ("techId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmaEvent" ADD CONSTRAINT "RmaEvent_rmaId_fkey" FOREIGN KEY ("rmaId") REFERENCES "Rma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- T10: customer.custom_data jsonb
ALTER TABLE "Customer" ADD COLUMN "customData" JSONB DEFAULT '{}';

-- T11: correlation id (business_key) on SO / Installation / ServiceTicket / Rma
ALTER TABLE "SalesOrder" ADD COLUMN "businessKey" TEXT;
CREATE UNIQUE INDEX "SalesOrder_businessKey_key" ON "SalesOrder"("businessKey");

ALTER TABLE "Installation" ADD COLUMN "businessKey" TEXT;
CREATE UNIQUE INDEX "Installation_businessKey_key" ON "Installation"("businessKey");

ALTER TABLE "ServiceTicket" ADD COLUMN "businessKey" TEXT;
CREATE UNIQUE INDEX "ServiceTicket_businessKey_key" ON "ServiceTicket"("businessKey");

CREATE UNIQUE INDEX "Rma_businessKey_key" ON "Rma"("businessKey");

