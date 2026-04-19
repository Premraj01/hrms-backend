import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { PayrollController } from './payroll.controller';
import { PayrollProfilesController } from './payroll-profiles.controller';
import { PayrollComponentsController } from './payroll-components.controller';
import { PayrollService } from './payroll.service';
import { Payslip, PayslipSchema } from './schemas/payslip.schema';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: Payslip.name, schema: PayslipSchema },
    ]),
  ],
  controllers: [
    PayrollController,
    PayrollProfilesController,
    PayrollComponentsController,
  ],
  providers: [PayrollService],
  exports: [PayrollService, MongooseModule],
})
export class PayrollModule {}
