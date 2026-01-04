import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResumeDocument = Resume & Document;

@Schema({ timestamps: true })
export class Resume {
  @Prop({ required: true })
  referralId: string; // Reference to PostgreSQL JobReferral.id

  @Prop({ required: true })
  candidateName: string;

  @Prop({ required: true })
  candidateEmail: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimetype: string;

  @Prop({ required: true })
  data: Buffer; // Binary data of the resume

  @Prop({ required: true })
  size: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

// Index for faster lookups
ResumeSchema.index({ referralId: 1 });
ResumeSchema.index({ candidateEmail: 1 });

