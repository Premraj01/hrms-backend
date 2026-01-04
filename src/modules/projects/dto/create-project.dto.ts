import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsDateString, MaxLength, IsIn } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'on-hold', 'completed', 'cancelled'])
  status?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

