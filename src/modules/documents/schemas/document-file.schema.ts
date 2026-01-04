import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DocumentFile extends Document {
  @Prop({ required: true })
  employeeDocumentId: string; // Reference to PostgreSQL EmployeeDocument.id

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimetype: string;

  @Prop({ required: true })
  data: Buffer; // Binary data of the document

  @Prop({ required: true })
  size: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const DocumentFileSchema = SchemaFactory.createForClass(DocumentFile);

// Index for faster lookups
DocumentFileSchema.index({ employeeDocumentId: 1 });

