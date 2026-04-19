/*
  Warnings:

  - You are about to drop the column `allowances` on the `payroll_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `deductions` on the `payroll_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `hra` on the `payroll_profiles` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PayrollComponentType" AS ENUM ('EARNING', 'DEDUCTION');

-- AlterTable
ALTER TABLE "payroll_profiles" DROP COLUMN "allowances",
DROP COLUMN "deductions",
DROP COLUMN "hra";

-- CreateTable
CREATE TABLE "payroll_components" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PayrollComponentType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_payroll_components" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_payroll_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_components_name_key" ON "payroll_components"("name");

-- CreateIndex
CREATE INDEX "payroll_components_type_idx" ON "payroll_components"("type");

-- CreateIndex
CREATE INDEX "employee_payroll_components_employee_id_idx" ON "employee_payroll_components"("employee_id");

-- CreateIndex
CREATE INDEX "employee_payroll_components_component_id_idx" ON "employee_payroll_components"("component_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_payroll_components_employee_id_component_id_key" ON "employee_payroll_components"("employee_id", "component_id");

-- AddForeignKey
ALTER TABLE "employee_payroll_components" ADD CONSTRAINT "employee_payroll_components_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_components" ADD CONSTRAINT "employee_payroll_components_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "payroll_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
