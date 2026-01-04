import { IsString, IsNotEmpty } from 'class-validator';

export class RejectLeaveDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}

