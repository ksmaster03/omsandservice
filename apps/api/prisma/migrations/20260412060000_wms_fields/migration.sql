-- Customer: WMS sync fields
ALTER TABLE "Customer" ADD COLUMN "wmsCode" TEXT;
ALTER TABLE "Customer" ADD COLUMN "alternateName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "alternateAddress" TEXT;
CREATE UNIQUE INDEX "Customer_wmsCode_key" ON "Customer"("wmsCode");

-- Product: WMS sync fields
ALTER TABLE "Product" ADD COLUMN "wmsPartNo" TEXT;
ALTER TABLE "Product" ADD COLUMN "partType" TEXT;
ALTER TABLE "Product" ADD COLUMN "uom" TEXT NOT NULL DEFAULT 'EA';
ALTER TABLE "Product" ADD COLUMN "standardPack" INTEGER;
CREATE UNIQUE INDEX "Product_wmsPartNo_key" ON "Product"("wmsPartNo");
