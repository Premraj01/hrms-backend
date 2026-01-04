-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('pending', 'accepted', 'declined', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('original', 'revised');

-- CreateTable
CREATE TABLE "candidate_offers" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "offer_letter_url" TEXT NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'pending',
    "offer_type" "OfferType" NOT NULL DEFAULT 'original',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT NOT NULL,
    "responded_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" TEXT,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_offers_referral_id_idx" ON "candidate_offers"("referral_id");

-- CreateIndex
CREATE INDEX "candidate_offers_status_idx" ON "candidate_offers"("status");

-- CreateIndex
CREATE INDEX "candidate_offers_created_by_id_idx" ON "candidate_offers"("created_by_id");

-- AddForeignKey
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "job_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
