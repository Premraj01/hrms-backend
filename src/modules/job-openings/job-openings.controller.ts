import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Logger,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobOpeningsService } from './job-openings.service';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto';
import { UpdateJobOpeningDto, UpdateJobStatusDto, UpdateReferralStatusDto } from './dto/update-job-opening.dto';
import { CreateInterviewRoundsDto, AssignInterviewerDto, UpdateInterviewStatusDto } from './dto/interview.dto';
import { CreateOfferDto, RevokeOfferDto } from './dto/offer.dto';
import { OnboardCandidateDto } from './dto/onboard-candidate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('job-openings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobOpeningsController {
  private readonly logger = new Logger(JobOpeningsController.name);

  constructor(private readonly jobOpeningsService: JobOpeningsService) {}

  @Post()
  @Roles('super_admin', 'admin', 'hr')
  create(@Body() createJobOpeningDto: CreateJobOpeningDto, @Request() req) {
    this.logger.log(`Creating job opening by user: ${req.user.id}`);
    return this.jobOpeningsService.create(createJobOpeningDto, req.user.id);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.jobOpeningsService.findAll(status);
  }

  @Get('my-referrals')
  findMyReferrals(@Request() req) {
    return this.jobOpeningsService.findMyReferrals(req.user.id);
  }

  @Get('candidates')
  @Roles('super_admin', 'admin', 'hr')
  findAllCandidates() {
    return this.jobOpeningsService.findAllCandidates();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobOpeningsService.findOne(id);
  }

  @Get(':id/referrals')
  @Roles('super_admin', 'admin', 'hr')
  findReferralsForJob(@Param('id') id: string) {
    return this.jobOpeningsService.findReferralsForJob(id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'hr')
  update(
    @Param('id') id: string,
    @Body() updateJobOpeningDto: UpdateJobOpeningDto,
  ) {
    return this.jobOpeningsService.update(id, updateJobOpeningDto);
  }

  @Patch(':id/status')
  @Roles('super_admin', 'admin', 'hr')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateJobStatusDto,
  ) {
    return this.jobOpeningsService.updateStatus(id, updateStatusDto.status);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'hr')
  remove(@Param('id') id: string) {
    return this.jobOpeningsService.remove(id);
  }

  @Post('referrals')
  @UseInterceptors(FileInterceptor('resume'))
  createReferral(
    @Body() body: any,
    @UploadedFile() resume: Express.Multer.File,
    @Request() req,
  ) {
    this.logger.log(`Creating referral by user: ${req.user.id}`);
    const createReferralDto = {
      jobOpeningId: body.jobOpeningId,
      candidateName: body.candidateName,
      candidateEmail: body.candidateEmail,
      candidatePhone: body.candidatePhone || undefined,
      experienceYears: parseInt(body.experienceYears, 10) || 0,
      notes: body.notes || undefined,
    };
    return this.jobOpeningsService.createReferral(createReferralDto, req.user.id, resume);
  }

  @Patch('referrals/:id/status')
  @Roles('super_admin', 'admin', 'hr')
  updateReferralStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReferralStatusDto,
  ) {
    return this.jobOpeningsService.updateReferralStatus(id, updateStatusDto.status);
  }

  @Get('referrals/:id/resume')
  async getResume(@Param('id') id: string) {
    return this.jobOpeningsService.getResume(id);
  }

  // ============================================
  // INTERVIEW PIPELINE ENDPOINTS
  // ============================================

  // Create interview rounds for a job opening
  @Post(':id/interview-rounds')
  @Roles('super_admin', 'admin', 'hr')
  createInterviewRounds(
    @Param('id') jobOpeningId: string,
    @Body() body: { rounds: { name: string; description?: string; roundNumber: number; isRequired?: boolean }[] },
  ) {
    const dto: CreateInterviewRoundsDto = {
      jobOpeningId,
      rounds: body.rounds,
    };
    return this.jobOpeningsService.createInterviewRounds(dto);
  }

  // Get interview rounds for a job opening
  @Get(':id/interview-rounds')
  @Roles('super_admin', 'admin', 'hr')
  getInterviewRounds(@Param('id') jobOpeningId: string) {
    return this.jobOpeningsService.getInterviewRounds(jobOpeningId);
  }

  // Start interview process for a candidate
  @Post('referrals/:id/start-process')
  @Roles('super_admin', 'admin', 'hr')
  startInterviewProcess(@Param('id') referralId: string, @Request() req) {
    return this.jobOpeningsService.startInterviewProcess(referralId, req.user.id);
  }

  // Get candidate's interview progress
  @Get('referrals/:id/progress')
  @Roles('super_admin', 'admin', 'hr')
  getCandidateProgress(@Param('id') referralId: string) {
    return this.jobOpeningsService.getCandidateInterviewProgress(referralId);
  }

  // Get candidate's interview history
  @Get('referrals/:id/history')
  @Roles('super_admin', 'admin', 'hr')
  getCandidateHistory(@Param('id') referralId: string) {
    return this.jobOpeningsService.getInterviewHistory(referralId);
  }

  // Assign interviewer to a round
  @Post('interviews/assign')
  @Roles('super_admin', 'admin', 'hr')
  assignInterviewer(@Body() dto: AssignInterviewerDto, @Request() req) {
    return this.jobOpeningsService.assignInterviewer(dto, req.user.id);
  }

  // Update interview round status (can be called by interviewer or HR)
  @Patch('referrals/:referralId/rounds/:roundId/status')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  updateInterviewRoundStatus(
    @Param('referralId') referralId: string,
    @Param('roundId') roundId: string,
    @Body() dto: UpdateInterviewStatusDto,
    @Request() req,
  ) {
    return this.jobOpeningsService.updateInterviewRoundStatus(
      referralId,
      roundId,
      dto,
      req.user.id,
    );
  }

  // ============================================
  // OFFER MANAGEMENT ENDPOINTS
  // ============================================

  // Make offer to candidate with offer letter upload
  @Post('referrals/:id/offers')
  @Roles('super_admin', 'admin', 'hr')
  @UseInterceptors(FileInterceptor('offerLetter'))
  makeOffer(
    @Param('id') referralId: string,
    @Body() dto: CreateOfferDto,
    @UploadedFile() offerLetter: Express.Multer.File,
    @Request() req,
  ) {
    if (!offerLetter) {
      throw new Error('Offer letter file is required');
    }
    return this.jobOpeningsService.makeOffer(referralId, dto, offerLetter, req.user.id);
  }

  // Get all offers for a candidate
  @Get('referrals/:id/offers')
  @Roles('super_admin', 'admin', 'hr')
  getCandidateOffers(@Param('id') referralId: string) {
    return this.jobOpeningsService.getCandidateOffers(referralId);
  }

  // Revoke an offer
  @Patch('offers/:offerId/revoke')
  @Roles('super_admin', 'admin', 'hr')
  revokeOffer(
    @Param('offerId') offerId: string,
    @Body() dto: RevokeOfferDto,
    @Request() req,
  ) {
    return this.jobOpeningsService.revokeOffer(offerId, dto, req.user.id);
  }

  // Download offer letter
  @Get('offers/:offerId/download')
  @Roles('super_admin', 'admin', 'hr')
  async downloadOfferLetter(
    @Param('offerId') offerId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const offerLetter = await this.jobOpeningsService.getOfferLetter(offerId);

    res.set({
      'Content-Type': offerLetter.mimetype,
      'Content-Disposition': `attachment; filename="${offerLetter.filename}"`,
    });

    return new StreamableFile(offerLetter.data);
  }

  // ============================================
  // ONBOARDING ENDPOINTS
  // ============================================

  // Onboard a candidate who accepted an offer
  @Post('referrals/:id/onboard')
  @Roles('super_admin', 'admin', 'hr')
  onboardCandidate(
    @Param('id') referralId: string,
    @Body() dto: OnboardCandidateDto,
    @Request() req,
  ) {
    this.logger.log(`Onboarding candidate ${referralId} by user: ${req.user.id}`);
    return this.jobOpeningsService.onboardCandidate(
      referralId,
      dto.employeeCode,
      dto.officeEmail,
      dto.reportingManagerId,
      dto.designationId,
      dto.joiningDate,
      req.user.id,
    );
  }
}

