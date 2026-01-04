/*
  Warnings:

  - A unique constraint covering the columns `[job_opening_id,candidate_email]` on the table `job_referrals` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "job_referrals_job_opening_id_candidate_email_key" ON "job_referrals"("job_opening_id", "candidate_email");
