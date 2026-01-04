import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  LEAVE_APPLIED = 'leave_applied',
  LEAVE_APPROVED = 'leave_approved',
  LEAVE_REJECTED = 'leave_rejected',
  DEPARTMENT_LEAVE = 'department_leave',
  PROJECT_ASSIGNED = 'project_assigned',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  recipientId: string; // Employee ID who receives the notification

  @Prop({ required: true })
  senderId: string; // Employee ID who triggered the notification

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object, required: false })
  metadata?: {
    leaveId?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    days?: number;
    reason?: string;
    rejectionReason?: string;
    employeeName?: string;
    department?: string;
    projectId?: string;
    projectName?: string;
    projectRole?: string;
    allocation?: number;
  };

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Add indexes for better query performance
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });

