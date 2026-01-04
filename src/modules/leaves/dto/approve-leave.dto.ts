import { IsString, IsOptional } from 'class-validator';

export class ApproveLeaveDto {
  @IsString()
  @IsOptional()
  comments?: string;
}

