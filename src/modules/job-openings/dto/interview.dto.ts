import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, IsEnum, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Interview round status enum matching Prisma
export enum InterviewRoundStatus {
  pending = 'pending',
  scheduled = 'scheduled',
  in_progress = 'in_progress',
  cleared = 'cleared',
  rejected = 'rejected',
  on_hold = 'on_hold',
  skipped = 'skipped',
}

// DTO for creating interview rounds for a job opening
export class CreateInterviewRoundDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  roundNumber: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

// DTO for creating multiple interview rounds at once
export class CreateInterviewRoundsDto {
  @IsString()
  jobOpeningId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInterviewRoundDto)
  rounds: CreateInterviewRoundDto[];
}

// DTO for assigning an interviewer to a candidate's round
export class AssignInterviewerDto {
  @IsString()
  referralId: string;

  @IsString()
  roundId: string;

  @IsString()
  interviewerId: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

// DTO for updating interview round status
export class UpdateInterviewStatusDto {
  @IsEnum(InterviewRoundStatus)
  status: InterviewRoundStatus;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO for starting the interview process (creates all rounds for a candidate)
export class StartInterviewProcessDto {
  @IsString()
  referralId: string;
}

// Response type for candidate interview progress
export interface CandidateInterviewProgress {
  referralId: string;
  candidateName: string;
  candidateEmail: string;
  overallStatus: string;
  rounds: {
    id: string;
    roundId: string;
    roundNumber: number;
    roundName: string;
    status: InterviewRoundStatus;
    interviewerId?: string;
    interviewerName?: string;
    scheduledAt?: Date;
    completedAt?: Date;
    feedback?: string;
    rating?: number;
  }[];
  canMakeOffer: boolean; // True if all required rounds are cleared
}

// Response type for interview history
export interface InterviewHistoryItem {
  id: string;
  action: string;
  roundNumber?: number;
  previousValue?: string;
  newValue?: string;
  notes?: string;
  changedById: string;
  changedByName?: string;
  createdAt: Date;
}

