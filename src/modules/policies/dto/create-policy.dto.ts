import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

export enum PolicyCategory {
  HR_EMPLOYEE_MANAGEMENT = 'HR_EMPLOYEE_MANAGEMENT',
  FINANCE_PROCUREMENT = 'FINANCE_PROCUREMENT',
  DATA_SECURITY_IT = 'DATA_SECURITY_IT',
  OPERATIONAL_SUPPLY_CHAIN = 'OPERATIONAL_SUPPLY_CHAIN',
  GENERAL = 'GENERAL',
}

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PolicyCategory)
  @IsOptional()
  category?: PolicyCategory;

  @IsString()
  @IsOptional()
  version?: string;
}

