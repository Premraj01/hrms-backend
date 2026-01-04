-- CreateEnum
CREATE TYPE "InterviewRoundStatus" AS ENUM ('pending', 'scheduled', 'in_progress', 'cleared', 'rejected', 'on_hold', 'skipped');

-- CreateTable
CREATE TABLE "interview_rounds" (
    "id" TEXT NOT NULL,
    "job_opening_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "round_number" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_interviews" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "interviewer_id" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "InterviewRoundStatus" NOT NULL DEFAULT 'pending',
    "feedback" TEXT,
    "rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_history" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "round_number" INTEGER,
    "previous_value" TEXT,
    "new_value" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interview_rounds_job_opening_id_idx" ON "interview_rounds"("job_opening_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_rounds_job_opening_id_round_number_key" ON "interview_rounds"("job_opening_id", "round_number");

-- CreateIndex
CREATE INDEX "candidate_interviews_referral_id_idx" ON "candidate_interviews"("referral_id");

-- CreateIndex
CREATE INDEX "candidate_interviews_round_id_idx" ON "candidate_interviews"("round_id");

-- CreateIndex
CREATE INDEX "candidate_interviews_interviewer_id_idx" ON "candidate_interviews"("interviewer_id");

-- CreateIndex
CREATE INDEX "candidate_interviews_status_idx" ON "candidate_interviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_interviews_referral_id_round_id_key" ON "candidate_interviews"("referral_id", "round_id");

-- CreateIndex
CREATE INDEX "interview_history_referral_id_idx" ON "interview_history"("referral_id");

-- CreateIndex
CREATE INDEX "interview_history_changed_by_id_idx" ON "interview_history"("changed_by_id");

-- CreateIndex
CREATE INDEX "interview_history_created_at_idx" ON "interview_history"("created_at");

-- AddForeignKey
ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "job_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_interviews" ADD CONSTRAINT "candidate_interviews_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "interview_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_history" ADD CONSTRAINT "interview_history_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "job_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
