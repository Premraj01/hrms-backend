-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('open', 'closed', 'on_hold', 'filled');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('full_time', 'part_time', 'contract', 'internship');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('entry', 'mid', 'senior', 'lead', 'executive');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'reviewing', 'interviewed', 'hired', 'rejected');

-- CreateTable
CREATE TABLE "job_openings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "responsibilities" TEXT,
    "department" TEXT,
    "location" TEXT NOT NULL,
    "job_type" "JobType" NOT NULL DEFAULT 'full_time',
    "experience_level" "ExperienceLevel" NOT NULL DEFAULT 'mid',
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "status" "JobStatus" NOT NULL DEFAULT 'open',
    "openings" INTEGER NOT NULL DEFAULT 1,
    "referral_bonus" INTEGER,
    "closing_date" TIMESTAMP(3),
    "posted_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_referrals" (
    "id" TEXT NOT NULL,
    "job_opening_id" TEXT NOT NULL,
    "referred_by_id" TEXT NOT NULL,
    "candidate_name" TEXT NOT NULL,
    "candidate_email" TEXT NOT NULL,
    "candidate_phone" TEXT,
    "resume_url" TEXT,
    "notes" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_openings_status_idx" ON "job_openings"("status");

-- CreateIndex
CREATE INDEX "job_openings_department_idx" ON "job_openings"("department");

-- CreateIndex
CREATE INDEX "job_openings_posted_by_id_idx" ON "job_openings"("posted_by_id");

-- CreateIndex
CREATE INDEX "job_openings_closing_date_idx" ON "job_openings"("closing_date");

-- CreateIndex
CREATE INDEX "job_referrals_job_opening_id_idx" ON "job_referrals"("job_opening_id");

-- CreateIndex
CREATE INDEX "job_referrals_referred_by_id_idx" ON "job_referrals"("referred_by_id");

-- CreateIndex
CREATE INDEX "job_referrals_status_idx" ON "job_referrals"("status");

-- CreateIndex
CREATE INDEX "job_referrals_candidate_email_idx" ON "job_referrals"("candidate_email");

-- AddForeignKey
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_referrals" ADD CONSTRAINT "job_referrals_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_referrals" ADD CONSTRAINT "job_referrals_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
