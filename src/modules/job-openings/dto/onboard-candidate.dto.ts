import { IsString, IsNotEmpty, IsEmail, IsOptional, IsDateString } from 'class-validator';

export class OnboardCandidateDto {
  @IsString()
  @IsNotEmpty()
  referralId: string;

  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsEmail()
  @IsNotEmpty()
  officeEmail: string;

  @IsString()
  @IsNotEmpty()
  reportingManagerId: string;

  @IsString()
  @IsOptional()
  designationId?: string;

  @IsDateString()
  @IsOptional()
  joiningDate?: string;
}

export interface OnboardingResult {
  success: boolean;
  message: string;
  employee: {
    id: string;
    employeeCode: string;
    officeEmail: string;
    firstName: string;
    lastName: string;
    department?: string;
  };
  defaultPassword: string;
}

