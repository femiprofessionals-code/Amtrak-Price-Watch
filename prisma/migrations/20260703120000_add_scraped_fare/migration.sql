-- CreateTable
CREATE TABLE "ScrapedFare" (
    "id" TEXT NOT NULL,
    "provider" "Provider" NOT NULL DEFAULT 'AMTRAK',
    "originCode" TEXT NOT NULL,
    "destinationCode" TEXT NOT NULL,
    "travelDate" DATE NOT NULL,
    "seatClass" "SeatClass" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapedFare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapedFare_scrapedAt_idx" ON "ScrapedFare"("scrapedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedFare_provider_originCode_destinationCode_travelDate__key" ON "ScrapedFare"("provider", "originCode", "destinationCode", "travelDate", "seatClass");
