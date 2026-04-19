import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PayslipDocument = Payslip & Document;

@Schema({ timestamps: true })
export class Payslip {
  @Prop({ required: true })
  employeeDocumentId: string; // Reference to PostgreSQL EmployeeDocument.id

  @Prop({ required: true })
  employeeId: string; // Reference to PostgreSQL Employee.id

  @Prop({ required: true })
  month: number; // 1-12

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimetype: string;

  @Prop({ required: true })
  data: Buffer; // Binary data of the payslip

  @Prop({ required: true })
  size: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PayslipSchema = SchemaFactory.createForClass(Payslip);

// Indexes for faster lookups
PayslipSchema.index({ employeeDocumentId: 1 });
PayslipSchema.index({ employeeId: 1 });
PayslipSchema.index({ year: 1, month: 1 });
