/*
  Warnings:

  - The values [pending,reviewing,hired] on the enum `ReferralStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReferralStatus_new" AS ENUM ('applied', 'screening', 'shortlisted', 'interviewing', 'interviewed', 'on_hold', 'offer_pending', 'offered', 'accepted', 'joined', 'rejected', 'withdrawn', 'offer_revoked', 'offer_declined');
ALTER TABLE "job_referrals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "job_referrals" ALTER COLUMN "status" TYPE "ReferralStatus_new" USING ("status"::text::"ReferralStatus_new");
ALTER TYPE "ReferralStatus" RENAME TO "ReferralStatus_old";
ALTER TYPE "ReferralStatus_new" RENAME TO "ReferralStatus";
DROP TYPE "ReferralStatus_old";
ALTER TABLE "job_referrals" ALTER COLUMN "status" SET DEFAULT 'applied';
COMMIT;

-- AlterTable
ALTER TABLE "job_referrals" ALTER COLUMN "status" SET DEFAULT 'applied';
