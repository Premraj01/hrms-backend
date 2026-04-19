import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { PayrollComponentType } from '@prisma/client';

export class CreatePayrollComponentDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsEnum(PayrollComponentType)
  type: PayrollComponentType;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePayrollComponentDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsEnum(PayrollComponentType)
  type?: PayrollComponentType;

  @IsOptional()
  @IsString()
  description?: string;
}
