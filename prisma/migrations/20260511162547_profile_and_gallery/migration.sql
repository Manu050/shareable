/*
  Warnings:

  - You are about to drop the column `image_url` on the `items` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- DropIndex
DROP INDEX "messages_request_id_idx";

-- AlterTable
ALTER TABLE "items" DROP COLUMN "image_url";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" VARCHAR(280),
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "item_images" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ratings" (
    "id" UUID NOT NULL,
    "rated_user_id" UUID NOT NULL,
    "rater_user_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_images_item_id_idx" ON "item_images"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_images_item_id_position_key" ON "item_images"("item_id", "position");

-- CreateIndex
CREATE INDEX "user_ratings_rated_user_id_idx" ON "user_ratings"("rated_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_ratings_request_id_rater_user_id_key" ON "user_ratings"("request_id", "rater_user_id");

-- CreateIndex
CREATE INDEX "messages_request_id_created_at_idx" ON "messages"("request_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_is_resolved_created_at_idx" ON "reports"("is_resolved", "created_at");

-- AddForeignKey
ALTER TABLE "item_images" ADD CONSTRAINT "item_images_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_rated_user_id_fkey" FOREIGN KEY ("rated_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_rater_user_id_fkey" FOREIGN KEY ("rater_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
