import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateJobOpeningDto } from './create-job-opening.dto';

export enum JobStatus {
  open = 'open',
  closed = 'closed',
  on_hold = 'on_hold',
  filled = 'filled',
}

export enum ReferralStatus {
  // 1. Sourcing & Screening
  applied = 'applied',
  screening = 'screening',
  shortlisted = 'shortlisted',

  // 2. Interviewing
  interviewing = 'interviewing',
  interviewed = 'interviewed',
  on_hold = 'on_hold',

  // 3. Decision & Closing
  offer_pending = 'offer_pending',
  offered = 'offered',
  accepted = 'accepted',
  offer_accepted = 'offer_accepted',
  joined = 'joined',

  // 4. Terminal Statuses (Archived)
  rejected = 'rejected',
  withdrawn = 'withdrawn',
  offer_revoked = 'offer_revoked',
  offer_declined = 'offer_declined',
}

export class UpdateJobOpeningDto extends PartialType(CreateJobOpeningDto) {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}

export class UpdateJobStatusDto {
  @IsEnum(JobStatus)
  status: JobStatus;
}

export class UpdateReferralStatusDto {
  @IsEnum(ReferralStatus)
  status: ReferralStatus;
}

