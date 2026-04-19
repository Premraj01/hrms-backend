import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PayrollProfileComponentDto {
  @IsUUID()
  componentId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;
}

export class UpsertPayrollProfileDto {
  @IsUUID()
  employeeId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basicSalary: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PayrollProfileComponentDto)
  components?: PayrollProfileComponentDto[];
}
