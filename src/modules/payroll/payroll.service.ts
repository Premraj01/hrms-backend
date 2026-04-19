import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prisma, PayrollComponentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Payslip, PayslipDocument } from './schemas/payslip.schema';
import { UploadPayslipDto } from './dto/upload-payslip.dto';
import { UpsertPayrollProfileDto } from './dto/upsert-payroll-profile.dto';
import { GeneratePayslipsDto } from './dto/generate-payslips.dto';
import {
  CreatePayrollComponentDto,
  UpdatePayrollComponentDto,
} from './dto/payroll-component.dto';
import { buildPayslipPdf } from './utils/payslip-pdf';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(Payslip.name) private payslipModel: Model<PayslipDocument>,
  ) {}

  async uploadPayslip(
    employeeId: string,
    dto: UploadPayslipDto,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    if (!file) {
      throw new BadRequestException('Payslip file is required');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are accepted for payslips');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const monthLabel = new Date(dto.year, dto.month - 1).toLocaleString(
      'default',
      { month: 'long' },
    );

    // Replace any existing payslip for the same (employee, month, year)
    await this.deleteExistingPayslip(employeeId, dto.month, dto.year);

    // Create EmployeeDocument record in PostgreSQL first (without documentUrl)
    const document = await this.prisma.employeeDocument.create({
      data: {
        employeeId,
        category: 'PAYROLL',
        documentType: 'PAYSLIP',
        title: dto.title || `Payslip - ${monthLabel} ${dto.year}`,
        description: dto.description,
        month: dto.month,
        year: dto.year,
        uploadedById,
        documentUrl: '', // Will update after MongoDB save
      },
    });

    const filename = buildPayslipFilename(
      employee.firstName,
      employee.lastName,
      dto.month,
      dto.year,
    );

    // Save payslip binary to MongoDB
    const payslipDoc = new this.payslipModel({
      employeeDocumentId: document.id,
      employeeId,
      month: dto.month,
      year: dto.year,
      filename,
      mimetype: file.mimetype,
      data: file.buffer,
      size: file.size,
    });
    const savedPayslip = await payslipDoc.save();

    // Update EmployeeDocument with MongoDB document ID
    const updated = await this.prisma.employeeDocument.update({
      where: { id: document.id },
      data: { documentUrl: savedPayslip._id.toString() },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(
      `Payslip uploaded for employee ${employeeId} (${monthLabel} ${dto.year})`,
    );

    return updated;
  }

  async getPayslipFile(employeeDocumentId: string) {
    const payslip = await this.payslipModel.findOne({ employeeDocumentId });

    if (!payslip) {
      throw new NotFoundException('Payslip file not found');
    }

    return {
      filename: payslip.filename,
      mimetype: payslip.mimetype,
      data: payslip.data,
      size: payslip.size,
    };
  }

  async findPayslipsForEmployee(
    employeeId: string,
    year?: number,
    month?: number,
  ) {
    const where: any = {
      employeeId,
      category: 'PAYROLL',
      documentType: 'PAYSLIP',
    };

    if (year !== undefined) where.year = year;
    if (month !== undefined) where.month = month;

    return this.prisma.employeeDocument.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  // ==========================================================================
  // Payroll Profile (salary structure) management
  // ==========================================================================

  async getProfile(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const profile = await this.prisma.payrollProfile.findUnique({
      where: { employeeId },
    });
    if (!profile) return null;

    const components = await this.prisma.employeePayrollComponent.findMany({
      where: { employeeId },
      include: { component: true },
      orderBy: { createdAt: 'asc' },
    });

    return { ...profile, components };
  }

  async getProfilesForEmployees(employeeIds: string[]) {
    if (employeeIds.length === 0) return [];
    const profiles = await this.prisma.payrollProfile.findMany({
      where: { employeeId: { in: employeeIds } },
    });
    const components = await this.prisma.employeePayrollComponent.findMany({
      where: { employeeId: { in: employeeIds } },
      include: { component: true },
      orderBy: { createdAt: 'asc' },
    });
    const byEmp = new Map<string, typeof components>();
    for (const c of components) {
      const arr = byEmp.get(c.employeeId) ?? [];
      arr.push(c);
      byEmp.set(c.employeeId, arr);
    }
    return profiles.map((p) => ({
      ...p,
      components: byEmp.get(p.employeeId) ?? [],
    }));
  }

  async upsertProfile(dto: UpsertPayrollProfileDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException(
        `Employee with ID ${dto.employeeId} not found`,
      );
    }

    const currency = dto.currency ?? 'INR';
    const basic = dto.basicSalary;
    const components = dto.components ?? [];

    // Validate referenced components exist and compute net salary dynamically
    let netSalary = basic;
    if (components.length > 0) {
      const componentIds = components.map((c) => c.componentId);
      const defs = await this.prisma.payrollComponent.findMany({
        where: { id: { in: componentIds } },
      });
      if (defs.length !== new Set(componentIds).size) {
        throw new BadRequestException(
          'One or more referenced payroll components do not exist',
        );
      }
      const typeById = new Map(defs.map((d) => [d.id, d.type]));
      for (const c of components) {
        const type = typeById.get(c.componentId);
        if (type === PayrollComponentType.EARNING) netSalary += c.amount;
        else if (type === PayrollComponentType.DEDUCTION)
          netSalary -= c.amount;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.payrollProfile.upsert({
        where: { employeeId: dto.employeeId },
        create: {
          employeeId: dto.employeeId,
          basicSalary: basic,
          netSalary,
          currency,
        },
        update: {
          basicSalary: basic,
          netSalary,
          currency,
        },
      });

      // Replace employee components atomically
      await tx.employeePayrollComponent.deleteMany({
        where: { employeeId: dto.employeeId },
      });
      if (components.length > 0) {
        await tx.employeePayrollComponent.createMany({
          data: components.map((c) => ({
            employeeId: dto.employeeId,
            componentId: c.componentId,
            amount: c.amount,
            currency,
          })),
        });
      }

      const saved = await tx.employeePayrollComponent.findMany({
        where: { employeeId: dto.employeeId },
        include: { component: true },
        orderBy: { createdAt: 'asc' },
      });

      return { ...profile, components: saved };
    });
  }

  // ==========================================================================
  // Global payroll component definitions
  // ==========================================================================

  async listComponents() {
    return this.prisma.payrollComponent.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async createComponent(dto: CreatePayrollComponentDto) {
    try {
      return await this.prisma.payrollComponent.create({
        data: {
          name: dto.name.trim(),
          type: dto.type,
          description: dto.description,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `A payroll component named "${dto.name}" already exists`,
        );
      }
      throw err;
    }
  }

  async updateComponent(id: string, dto: UpdatePayrollComponentDto) {
    const existing = await this.prisma.payrollComponent.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Payroll component ${id} not found`);
    }
    try {
      return await this.prisma.payrollComponent.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          type: dto.type,
          description: dto.description,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `A payroll component with that name already exists`,
        );
      }
      throw err;
    }
  }

  async deleteComponent(id: string) {
    const existing = await this.prisma.payrollComponent.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Payroll component ${id} not found`);
    }
    await this.prisma.payrollComponent.delete({ where: { id } });
    return { success: true };
  }

  // ==========================================================================
  // Batch payslip generation
  // ==========================================================================

  async generateMonthlyPayslips(
    dto: GeneratePayslipsDto,
    uploadedById: string,
  ) {
    const employeeWhere: any = { status: 'active' };
    if (dto.employeeIds && dto.employeeIds.length > 0) {
      employeeWhere.id = { in: dto.employeeIds };
    }

    const employees = await this.prisma.employee.findMany({
      where: employeeWhere,
      include: {
        payrollProfile: true,
        payrollComponents: { include: { component: true } },
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
    });

    const generated: { employeeId: string; documentId: string }[] = [];
    const skipped: { employeeId: string; name: string; reason: string }[] = [];

    for (const emp of employees) {
      if (!emp.payrollProfile) {
        skipped.push({
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          reason: 'Missing payroll profile',
        });
        continue;
      }

      try {
        const doc = await this.generateSinglePayslip(
          emp,
          dto.month,
          dto.year,
          uploadedById,
        );
        generated.push({ employeeId: emp.id, documentId: doc.id });
      } catch (err) {
        this.logger.error(
          `Failed to generate payslip for ${emp.id}: ${(err as Error).message}`,
        );
        skipped.push({
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          reason: 'Generation error',
        });
      }
    }

    return {
      month: dto.month,
      year: dto.year,
      generatedCount: generated.length,
      skippedCount: skipped.length,
      generated,
      skipped,
    };
  }

  private async generateSinglePayslip(
    emp: any,
    month: number,
    year: number,
    uploadedById: string,
  ) {
    const monthLabel = new Date(year, month - 1).toLocaleString('default', {
      month: 'long',
    });

    const components = (emp.payrollComponents ?? []) as Array<{
      amount: number;
      component: { name: string; type: PayrollComponentType };
    }>;
    const earnings = components
      .filter((c) => c.component.type === PayrollComponentType.EARNING)
      .map((c) => ({ label: c.component.name, amount: c.amount }));
    const deductions = components
      .filter((c) => c.component.type === PayrollComponentType.DEDUCTION)
      .map((c) => ({ label: c.component.name, amount: c.amount }));

    const { leaveDays, daysWorked } = await this.computeLeaveStats(
      emp.id,
      month,
      year,
    );

    const pdfBuffer = buildPayslipPdf({
      employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
      employeeCode: emp.employeeCode,
      department: emp.department?.name,
      designation: emp.designation?.name,
      location: emp.city ?? null,
      joiningDate: formatJoiningDate(emp.joiningDate),
      month,
      year,
      currency: emp.payrollProfile.currency,
      basicSalary: emp.payrollProfile.basicSalary,
      earnings,
      deductions,
      netSalary: emp.payrollProfile.netSalary,
      leaveDays,
      daysWorked,
    });

    // Replace any existing payslip for the same (employee, month, year)
    await this.deleteExistingPayslip(emp.id, month, year);

    const document = await this.prisma.employeeDocument.create({
      data: {
        employeeId: emp.id,
        category: 'PAYROLL',
        documentType: 'PAYSLIP',
        title: `Payslip - ${monthLabel} ${year}`,
        description: `Auto-generated payslip for ${monthLabel} ${year}`,
        month,
        year,
        uploadedById,
        documentUrl: '',
      },
    });

    const filename = buildPayslipFilename(
      emp.firstName,
      emp.lastName,
      month,
      year,
    );

    const payslipDoc = new this.payslipModel({
      employeeDocumentId: document.id,
      employeeId: emp.id,
      month,
      year,
      filename,
      mimetype: 'application/pdf',
      data: pdfBuffer,
      size: pdfBuffer.length,
    });
    const savedPayslip = await payslipDoc.save();

    return this.prisma.employeeDocument.update({
      where: { id: document.id },
      data: { documentUrl: savedPayslip._id.toString() },
    });
  }

  private async deleteExistingPayslip(
    employeeId: string,
    month: number,
    year: number,
  ) {
    const existing = await this.prisma.employeeDocument.findMany({
      where: {
        employeeId,
        category: 'PAYROLL',
        documentType: 'PAYSLIP',
        month,
        year,
      },
      select: { id: true },
    });

    if (existing.length === 0) return;

    const ids = existing.map((d) => d.id);
    await this.payslipModel.deleteMany({ employeeDocumentId: { $in: ids } });
    await this.prisma.employeeDocument.deleteMany({
      where: { id: { in: ids } },
    });

    this.logger.log(
      `Replaced ${existing.length} existing payslip(s) for employee ${employeeId} (${month}/${year})`,
    );
  }

  private async computeLeaveStats(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<{ leaveDays: number; daysWorked: number }> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    const leaves = await this.prisma.leave.findMany({
      where: {
        employeeId,
        status: 'approved',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { startDate: true, endDate: true, days: true },
    });

    const DAY_MS = 86400000;
    let leaveDays = 0;
    for (const l of leaves) {
      const start = l.startDate > monthStart ? l.startDate : monthStart;
      const end = l.endDate < monthEnd ? l.endDate : monthEnd;
      const overlap = Math.max(
        0,
        Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1,
      );
      const totalDays =
        Math.floor((l.endDate.getTime() - l.startDate.getTime()) / DAY_MS) + 1;
      const portion = totalDays > 0 ? overlap / totalDays : 1;
      leaveDays += l.days * portion;
    }

    const rounded = Math.round(leaveDays * 10) / 10;
    return {
      leaveDays: rounded,
      daysWorked: Math.max(0, daysInMonth - rounded),
    };
  }
}

function buildPayslipFilename(
  firstName: string,
  lastName: string,
  month: number,
  year: number,
): string {
  const monthLabel = new Date(year, month - 1).toLocaleString('default', {
    month: 'long',
  });
  const sanitize = (s: string) =>
    s.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `${sanitize(firstName)}_${sanitize(lastName)}_${monthLabel}_${year}.pdf`;
}

function formatJoiningDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
