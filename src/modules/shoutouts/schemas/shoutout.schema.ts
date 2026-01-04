import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShoutoutDocument = Shoutout & Document;

export enum ShoutoutType {
  EMPLOYEE = 'employee',
  TEAM = 'team',
}

export enum ShoutoutTitle {
  EMPLOYEE_OF_THE_MONTH = 'Employee of the Month',
  OUTSTANDING_PERFORMANCE = 'Outstanding Performance',
  TEAM_PLAYER = 'Team Player',
  INNOVATION_AWARD = 'Innovation Award',
  CUSTOMER_CHAMPION = 'Customer Champion',
  RISING_STAR = 'Rising Star',
  LEADERSHIP_EXCELLENCE = 'Leadership Excellence',
  CUSTOM = 'Custom',
}

@Schema({ timestamps: true })
export class Shoutout {
  @Prop({ required: true, enum: ShoutoutType })
  type: ShoutoutType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  givenById: string; // Employee ID who gave the shoutout

  @Prop({ required: true })
  givenByName: string; // Full name of the person who gave it

  @Prop()
  givenByPhoto?: string; // Profile photo URL

  // For employee shoutouts
  @Prop()
  recipientId?: string; // Employee ID

  @Prop()
  recipientName?: string; // Employee full name

  @Prop()
  recipientPhoto?: string; // Profile photo URL

  // For team/project shoutouts
  @Prop()
  projectId?: string;

  @Prop()
  projectName?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ShoutoutSchema = SchemaFactory.createForClass(Shoutout);

// Add indexes for better query performance
ShoutoutSchema.index({ type: 1, createdAt: -1 });
ShoutoutSchema.index({ recipientId: 1 });
ShoutoutSchema.index({ projectId: 1 });
ShoutoutSchema.index({ givenById: 1 });

