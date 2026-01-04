import { IsString, IsOptional, IsEmail, IsUUID, IsInt, Min } from 'class-validator';

export class CreateReferralDto {
  @IsUUID()
  jobOpeningId: string;

  @IsString()
  candidateName: string;

  @IsEmail()
  candidateEmail: string;

  @IsOptional()
  @IsString()
  candidatePhone?: string;

  @IsInt()
  @Min(0)
  experienceYears: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

