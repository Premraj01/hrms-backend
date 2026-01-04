-- CreateEnum
CREATE TYPE "PolicyCategory" AS ENUM ('HR_EMPLOYEE_MANAGEMENT', 'FINANCE_PROCUREMENT', 'DATA_SECURITY_IT', 'OPERATIONAL_SUPPLY_CHAIN', 'GENERAL');

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "PolicyCategory" NOT NULL DEFAULT 'GENERAL',
    "document_url" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "policies_category_idx" ON "policies"("category");

-- CreateIndex
CREATE INDEX "policies_is_active_idx" ON "policies"("is_active");

-- CreateIndex
CREATE INDEX "policies_created_by_id_idx" ON "policies"("created_by_id");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
