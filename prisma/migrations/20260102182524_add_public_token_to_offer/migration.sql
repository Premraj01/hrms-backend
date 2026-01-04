/*
  Warnings:

  - A unique constraint covering the columns `[public_token]` on the table `candidate_offers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `public_token` to the `candidate_offers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "candidate_offers" ADD COLUMN     "public_token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "candidate_offers_public_token_key" ON "candidate_offers"("public_token");

-- CreateIndex
CREATE INDEX "candidate_offers_public_token_idx" ON "candidate_offers"("public_token");
