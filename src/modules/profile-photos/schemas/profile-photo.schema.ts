import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProfilePhotoDocument = ProfilePhoto & Document;

@Schema({ timestamps: true })
export class ProfilePhoto {
  @Prop({ required: true, unique: true })
  employeeId: string; // Employee UUID from PostgreSQL

  @Prop({ required: true })
  data: Buffer; // Binary image data

  @Prop({ required: true })
  mimeType: string; // e.g., 'image/jpeg', 'image/png'

  @Prop({ required: true })
  filename: string; // Original filename

  @Prop({ required: true })
  size: number; // File size in bytes

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ProfilePhotoSchema = SchemaFactory.createForClass(ProfilePhoto);

// Add index for quick lookup by employeeId
ProfilePhotoSchema.index({ employeeId: 1 }, { unique: true });

