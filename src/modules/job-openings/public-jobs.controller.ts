import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../common/decorators/public.decorator';
import { JobOpeningsService } from './job-openings.service';

/**
 * Public controller for candidates to view and apply for jobs
 * These endpoints do NOT require authentication
 */
@Controller('public/jobs')
@Public()
export class PublicJobsController {
  constructor(private readonly jobOpeningsService: JobOpeningsService) {}

  /**
   * Get all open job positions (public)
   */
  @Get()
  async getOpenJobs() {
    return this.jobOpeningsService.findPublicJobs();
  }

  /**
   * Get job details by ID (public)
   */
  @Get(':id')
  async getJobById(@Param('id') id: string) {
    return this.jobOpeningsService.findPublicJobById(id);
  }

  /**
   * Apply for a job (public - no referral)
   */
  @Post(':id/apply')
  @UseInterceptors(FileInterceptor('resume'))
  async applyForJob(
    @Param('id') jobId: string,
    @Body()
    body: {
      candidateName: string;
      candidateEmail: string;
      candidatePhone?: string;
      experienceYears?: string | number;
      linkedinUrl?: string;
      coverLetter?: string;
    },
    @UploadedFile() resume?: Express.Multer.File,
  ) {
    if (!body.candidateName || !body.candidateEmail) {
      throw new BadRequestException('Candidate name and email are required');
    }

    // Parse experienceYears from form data (comes as string)
    const experienceYears = body.experienceYears
      ? parseInt(String(body.experienceYears), 10)
      : 0;

    return this.jobOpeningsService.applyForJob(jobId, {
      candidateName: body.candidateName,
      candidateEmail: body.candidateEmail,
      candidatePhone: body.candidatePhone,
      experienceYears: isNaN(experienceYears) ? 0 : experienceYears,
      linkedinUrl: body.linkedinUrl,
      coverLetter: body.coverLetter,
      resume,
    });
  }
}

