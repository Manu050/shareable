-- CreateEnum
CREATE TYPE "WantedItemStatus" AS ENUM ('open', 'fulfilled', 'cancelled');

-- CreateTable
CREATE TABLE "wanted_items" (
    "id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "max_price_per_day" DECIMAL(10,2),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_m" INTEGER NOT NULL DEFAULT 2000,
    "status" "WantedItemStatus" NOT NULL DEFAULT 'open',
    "expires_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wanted_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wanted_item_matches" (
    "id" UUID NOT NULL,
    "wanted_item_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_at" TIMESTAMP(6),

    CONSTRAINT "wanted_item_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wanted_items_status_category_idx" ON "wanted_items"("status", "category");

-- CreateIndex
CREATE INDEX "wanted_items_requester_id_idx" ON "wanted_items"("requester_id");

-- CreateIndex
CREATE INDEX "wanted_item_matches_wanted_item_id_seen_at_idx" ON "wanted_item_matches"("wanted_item_id", "seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "wanted_item_matches_wanted_item_id_item_id_key" ON "wanted_item_matches"("wanted_item_id", "item_id");

-- AddForeignKey
ALTER TABLE "wanted_items" ADD CONSTRAINT "wanted_items_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wanted_item_matches" ADD CONSTRAINT "wanted_item_matches_wanted_item_id_fkey" FOREIGN KEY ("wanted_item_id") REFERENCES "wanted_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wanted_item_matches" ADD CONSTRAINT "wanted_item_matches_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
