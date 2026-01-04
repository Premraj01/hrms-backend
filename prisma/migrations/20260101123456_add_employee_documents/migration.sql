-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('EMPLOYMENT', 'PAYROLL');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('OFFER_LETTER', 'JOINING_LETTER', 'PAYSLIP', 'APPRAISAL_LETTER', 'FORM_16');

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "document_url" TEXT,
    "month" INTEGER,
    "year" INTEGER,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_idx" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_category_idx" ON "employee_documents"("category");

-- CreateIndex
CREATE INDEX "employee_documents_document_type_idx" ON "employee_documents"("document_type");

-- CreateIndex
CREATE INDEX "employee_documents_year_month_idx" ON "employee_documents"("year", "month");

-- CreateIndex
CREATE INDEX "employee_documents_uploaded_by_id_idx" ON "employee_documents"("uploaded_by_id");

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
