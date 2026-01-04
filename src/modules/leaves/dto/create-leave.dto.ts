import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateLeaveDto {
  @IsString()
  @IsNotEmpty()
  leaveType: string; // Annual, Sick, Casual, Personal, WFH, Compensatory

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsNumber()
  @Min(0.5)
  days: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

