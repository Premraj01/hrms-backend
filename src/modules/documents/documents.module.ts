import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentFile, DocumentFileSchema } from './schemas/document-file.schema';
import { Payslip, PayslipSchema } from '../payroll/schemas/payslip.schema';
import { PrismaModule } from '../../database/prisma/prisma.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentFile.name, schema: DocumentFileSchema },
      { name: Payslip.name, schema: PayslipSchema },
    ]),
    PrismaModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

