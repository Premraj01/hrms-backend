import { IsString, IsOptional, IsEnum, IsNumber, Min, ValidateIf } from 'class-validator';

export enum JobType {
  full_time = 'full_time',
  part_time = 'part_time',
  contract = 'contract',
  internship = 'internship',
}

export enum ExperienceLevel {
  entry = 'entry',
  mid = 'mid',
  senior = 'senior',
  lead = 'lead',
  executive = 'executive',
}

export class CreateJobOpeningDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  requirements: string;

  @IsOptional()
  @IsString()
  responsibilities?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType = JobType.full_time;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel = ExperienceLevel.mid;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  openings?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referralBonus?: number;

  @IsOptional()
  @ValidateIf((o) => o.closingDate !== '' && o.closingDate !== null)
  @IsString()
  closingDate?: string;
}

