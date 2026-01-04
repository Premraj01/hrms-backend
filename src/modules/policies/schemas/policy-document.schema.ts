import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PolicyDocumentDocument = PolicyDocument & Document;

@Schema({ timestamps: true })
export class PolicyDocument {
  @Prop({ required: true, unique: true })
  policyId: string; // Policy UUID from PostgreSQL

  @Prop({ required: true })
  data: Buffer; // Binary document data (PDF, etc.)

  @Prop({ required: true })
  mimeType: string; // e.g., 'application/pdf'

  @Prop({ required: true })
  filename: string; // Original filename

  @Prop({ required: true })
  size: number; // File size in bytes

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PolicyDocumentSchema =
  SchemaFactory.createForClass(PolicyDocument);

// Add index for quick lookup by policyId
PolicyDocumentSchema.index({ policyId: 1 }, { unique: true });

