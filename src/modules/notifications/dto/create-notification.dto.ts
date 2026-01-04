import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsObject()
  @IsOptional()
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
}

