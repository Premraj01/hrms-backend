import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto';
import { UpdateJobOpeningDto, JobStatus, ReferralStatus } from './dto/update-job-opening.dto';
import { CreateReferralDto } from './dto/create-referral.dto';
import {
  CreateInterviewRoundsDto,
  AssignInterviewerDto,
  UpdateInterviewStatusDto,
  InterviewRoundStatus,
  CandidateInterviewProgress,
  InterviewHistoryItem
} from './dto/interview.dto';
import {
  CreateOfferDto,
  RevokeOfferDto,
  OfferStatus,
  OfferType,
  CandidateOfferResponse,
  CandidateOffersResponse,
} from './dto/offer.dto';
import { JobStatus as PrismaJobStatus, ReferralStatus as PrismaReferralStatus, InterviewRoundStatus as PrismaInterviewRoundStatus, OfferStatus as PrismaOfferStatus, OfferType as PrismaOfferType } from '@prisma/client';
import { Resume, ResumeDocument } from './schemas/resume.schema';
import { OfferLetter, OfferLetterDocument } from './schemas/offer-letter.schema';

@Injectable()
export class JobOpeningsService {
  private readonly logger = new Logger(JobOpeningsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
    @InjectModel(OfferLetter.name) private offerLetterModel: Model<OfferLetterDocument>,
  ) {}

  async create(dto: CreateJobOpeningDto, postedById: string) {
    this.logger.log(`Creating job opening: ${dto.title}`);

    return this.prisma.jobOpening.create({
      data: {
        title: dto.title,
        description: dto.description,
        requirements: dto.requirements,
        responsibilities: dto.responsibilities,
        department: dto.department,
        location: dto.location,
        jobType: dto.jobType as any,
        experienceLevel: dto.experienceLevel as any,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        openings: dto.openings || 1,
        referralBonus: dto.referralBonus,
        closingDate: dto.closingDate ? new Date(dto.closingDate) : null,
        postedById,
      },
      include: {
        postedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findAll(status?: string) {
    const where = status ? { status: status as PrismaJobStatus } : {};

    const jobs = await this.prisma.jobOpening.findMany({
      where,
      include: {
        postedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { referrals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job) => ({
      ...job,
      postedByName: `${job.postedBy.firstName} ${job.postedBy.lastName}`,
    }));
  }

  async findOne(id: string) {
    const job = await this.prisma.jobOpening.findUnique({
      where: { id },
      include: {
        postedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        referrals: {
          include: {
            referredBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job opening with ID ${id} not found`);
    }

    return {
      ...job,
      postedByName: `${job.postedBy.firstName} ${job.postedBy.lastName}`,
    };
  }

  async update(id: string, dto: UpdateJobOpeningDto) {
    await this.findOne(id);

    return this.prisma.jobOpening.update({
      where: { id },
      data: {
        ...dto,
        closingDate: dto.closingDate ? new Date(dto.closingDate) : undefined,
      },
      include: {
        postedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async updateStatus(id: string, status: JobStatus) {
    await this.findOne(id);

    return this.prisma.jobOpening.update({
      where: { id },
      data: { status: status as PrismaJobStatus },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.jobOpening.delete({ where: { id } });
  }

  // Referral methods
  async createReferral(dto: CreateReferralDto, referredById: string, resume?: Express.Multer.File) {
    this.logger.log(`Creating referral for job ${dto.jobOpeningId}`);

    await this.findOne(dto.jobOpeningId);

    // Check if candidate with same email already exists for this job
    const existingReferral = await this.prisma.jobReferral.findUnique({
      where: {
        unique_candidate_per_job: {
          jobOpeningId: dto.jobOpeningId,
          candidateEmail: dto.candidateEmail,
        },
      },
    });

    if (existingReferral) {
      throw new BadRequestException(
        `A candidate with email "${dto.candidateEmail}" has already been referred for this job opening.`
      );
    }

    // Create referral in PostgreSQL
    const referral = await this.prisma.jobReferral.create({
      data: {
        jobOpeningId: dto.jobOpeningId,
        referredById,
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        candidatePhone: dto.candidatePhone,
        experienceYears: dto.experienceYears,
        notes: dto.notes,
      },
      include: {
        referredBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // If resume is provided, save to MongoDB and update referral with resumeUrl
    if (resume) {
      const resumeDoc = new this.resumeModel({
        referralId: referral.id,
        candidateName: dto.candidateName,
        candidateEmail: dto.candidateEmail,
        filename: resume.originalname,
        mimetype: resume.mimetype,
        data: resume.buffer,
        size: resume.size,
      });
      const savedResume = await resumeDoc.save();

      // Update referral with MongoDB document ID
      await this.prisma.jobReferral.update({
        where: { id: referral.id },
        data: { resumeUrl: savedResume._id.toString() },
      });
    }

    return {
      ...referral,
      referredByName: `${referral.referredBy.firstName} ${referral.referredBy.lastName}`,
    };
  }

  async findMyReferrals(employeeId: string) {
    const referrals = await this.prisma.jobReferral.findMany({
      where: { referredById: employeeId },
      include: {
        jobOpening: { select: { id: true, title: true, status: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return referrals.map((r) => ({
      ...r,
      hasResume: !!r.resumeUrl,
    }));
  }

  async findReferralsForJob(jobId: string) {
    const referrals = await this.prisma.jobReferral.findMany({
      where: { jobOpeningId: jobId },
      include: {
        referredBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return referrals.map((r) => ({
      ...r,
      referredByName: `${r.referredBy.firstName} ${r.referredBy.lastName}`,
      hasResume: !!r.resumeUrl,
    }));
  }

  async updateReferralStatus(referralId: string, status: ReferralStatus) {
    const referral = await this.prisma.jobReferral.findUnique({
      where: { id: referralId },
    });

    if (!referral) {
      throw new NotFoundException(`Referral with ID ${referralId} not found`);
    }

    return this.prisma.jobReferral.update({
      where: { id: referralId },
      data: { status: status as PrismaReferralStatus },
    });
  }

  async getResume(referralId: string) {
    const referral = await this.prisma.jobReferral.findUnique({
      where: { id: referralId },
    });

    if (!referral || !referral.resumeUrl) {
      throw new NotFoundException(`Resume not found for referral ${referralId}`);
    }

    const resume = await this.resumeModel.findById(referral.resumeUrl);
    if (!resume) {
      throw new NotFoundException(`Resume document not found`);
    }

    return {
      filename: resume.filename,
      mimetype: resume.mimetype,
      data: resume.data.toString('base64'),
      size: resume.size,
    };
  }

  // Get all candidates across all job openings
  async findAllCandidates() {
    const candidates = await this.prisma.jobReferral.findMany({
      include: {
        jobOpening: {
          select: { id: true, title: true, department: true },
        },
        referredBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return candidates.map((candidate) => ({
      ...candidate,
      jobTitle: candidate.jobOpening.title,
      department: candidate.jobOpening.department,
      referredByName: `${candidate.referredBy.firstName} ${candidate.referredBy.lastName}`,
    }));
  }

  // ============================================
  // INTERVIEW PIPELINE METHODS
  // ============================================

  // Create interview rounds for a job opening
  async createInterviewRounds(dto: CreateInterviewRoundsDto) {
    this.logger.log(`Creating interview rounds for job ${dto.jobOpeningId}`);

    await this.findOne(dto.jobOpeningId);

    const rounds = await Promise.all(
      dto.rounds.map((round) =>
        this.prisma.interviewRound.create({
          data: {
            jobOpeningId: dto.jobOpeningId,
            name: round.name,
            description: round.description,
            roundNumber: round.roundNumber,
            isRequired: round.isRequired ?? true,
          },
        })
      )
    );

    return rounds;
  }

  // Get interview rounds for a job opening
  async getInterviewRounds(jobOpeningId: string) {
    return this.prisma.interviewRound.findMany({
      where: { jobOpeningId },
      orderBy: { roundNumber: 'asc' },
    });
  }

  // Start interview process for a candidate (creates CandidateInterview records)
  async startInterviewProcess(referralId: string, changedById: string) {
    const referral = await this.prisma.jobReferral.findUnique({
      where: { id: referralId },
      include: { jobOpening: true },
    });

    if (!referral) {
      throw new NotFoundException(`Referral with ID ${referralId} not found`);
    }

    // Get all interview rounds for this job
    const rounds = await this.getInterviewRounds(referral.jobOpeningId);

    if (rounds.length === 0) {
      throw new BadRequestException(
        'No interview rounds defined for this job opening. Please create rounds first.'
      );
    }

    // Create CandidateInterview records for each round
    const interviews = await Promise.all(
      rounds.map((round) =>
        this.prisma.candidateInterview.create({
          data: {
            referralId,
            roundId: round.id,
            status: round.roundNumber === 1 ? 'pending' : 'pending',
          },
        })
      )
    );

    // Update referral status to screening
    await this.prisma.jobReferral.update({
      where: { id: referralId },
      data: { status: 'screening' },
    });

    // Log history
    await this.addInterviewHistory(referralId, changedById, 'process_started', null, null, 'screening', 'Interview process started');

    return interviews;
  }

  // Assign interviewer to a round
  async assignInterviewer(dto: AssignInterviewerDto, changedById: string) {
    const interview = await this.prisma.candidateInterview.findUnique({
      where: {
        referralId_roundId: {
          referralId: dto.referralId,
          roundId: dto.roundId,
        },
      },
      include: { round: true },
    });

    if (!interview) {
      throw new NotFoundException('Interview record not found');
    }

    // Verify interviewer exists
    const interviewer = await this.prisma.employee.findUnique({
      where: { id: dto.interviewerId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!interviewer) {
      throw new NotFoundException('Interviewer not found');
    }

    const updated = await this.prisma.candidateInterview.update({
      where: { id: interview.id },
      data: {
        interviewerId: dto.interviewerId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: dto.scheduledAt ? 'scheduled' : interview.status,
      },
    });

    // Log history
    await this.addInterviewHistory(
      dto.referralId,
      changedById,
      'interviewer_assigned',
      interview.round.roundNumber,
      null,
      `${interviewer.firstName} ${interviewer.lastName}`,
      `Interviewer assigned for ${interview.round.name}`
    );

    return updated;
  }

  // Update interview round status (called by interviewer or HR)
  async updateInterviewRoundStatus(
    referralId: string,
    roundId: string,
    dto: UpdateInterviewStatusDto,
    changedById: string
  ) {
    const interview = await this.prisma.candidateInterview.findUnique({
      where: {
        referralId_roundId: { referralId, roundId },
      },
      include: { round: true, referral: true },
    });

    if (!interview) {
      throw new NotFoundException('Interview record not found');
    }

    const previousStatus = interview.status;

    const updated = await this.prisma.candidateInterview.update({
      where: { id: interview.id },
      data: {
        status: dto.status as PrismaInterviewRoundStatus,
        feedback: dto.feedback,
        rating: dto.rating,
        completedAt: ['cleared', 'rejected'].includes(dto.status) ? new Date() : null,
      },
    });

    // Log history
    await this.addInterviewHistory(
      referralId,
      changedById,
      'round_status_changed',
      interview.round.roundNumber,
      previousStatus,
      dto.status,
      dto.notes || `${interview.round.name}: ${previousStatus} → ${dto.status}`
    );

    // If rejected, update overall referral status
    if (dto.status === InterviewRoundStatus.rejected) {
      await this.prisma.jobReferral.update({
        where: { id: referralId },
        data: { status: 'rejected' },
      });
    }

    // If cleared, check if all rounds are cleared
    if (dto.status === InterviewRoundStatus.cleared) {
      // Check if all interview rounds for this candidate are cleared
      const allInterviews = await this.prisma.candidateInterview.findMany({
        where: { referralId },
        include: { round: true },
      });

      const allCleared = allInterviews.every((i) => i.status === 'cleared');

      if (allCleared) {
        // All rounds cleared - update to interview_cleared
        await this.prisma.jobReferral.update({
          where: { id: referralId },
          data: { status: 'interview_cleared' },
        });
      } else if (interview.round.roundNumber === 1) {
        // First round (resume shortlisting) cleared - update to interviewing
        await this.prisma.jobReferral.update({
          where: { id: referralId },
          data: { status: 'interviewing' },
        });
      }
    }

    return updated;
  }

  // Get candidate's interview progress
  async getCandidateInterviewProgress(referralId: string): Promise<CandidateInterviewProgress> {
    const referral = await this.prisma.jobReferral.findUnique({
      where: { id: referralId },
      include: {
        interviews: {
          include: {
            round: true,
          },
          orderBy: { round: { roundNumber: 'asc' } },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException(`Referral with ID ${referralId} not found`);
    }

    // Get interviewer names
    const interviewerIds = referral.interviews
      .filter((i) => i.interviewerId)
      .map((i) => i.interviewerId as string);

    const interviewers = await this.prisma.employee.findMany({
      where: { id: { in: interviewerIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const interviewerMap = new Map(
      interviewers.map((i) => [i.id, `${i.firstName} ${i.lastName}`])
    );

    // Check if all required rounds are cleared
    const requiredRounds = referral.interviews.filter((i) => i.round.isRequired);
    const canMakeOffer = requiredRounds.every((i) => i.status === 'cleared');

    return {
      referralId: referral.id,
      candidateName: referral.candidateName,
      candidateEmail: referral.candidateEmail,
      overallStatus: referral.status,
      rounds: referral.interviews.map((i) => ({
        id: i.id,
        roundId: i.roundId,
        roundNumber: i.round.roundNumber,
        roundName: i.round.name,
        status: i.status as InterviewRoundStatus,
        interviewerId: i.interviewerId || undefined,
        interviewerName: i.interviewerId ? interviewerMap.get(i.interviewerId) : undefined,
        scheduledAt: i.scheduledAt || undefined,
        completedAt: i.completedAt || undefined,
        feedback: i.feedback || undefined,
        rating: i.rating || undefined,
      })),
      canMakeOffer,
    };
  }

  // Get interview history for a candidate
  async getInterviewHistory(referralId: string): Promise<InterviewHistoryItem[]> {
    const history = await this.prisma.interviewHistory.findMany({
      where: { referralId },
      orderBy: { createdAt: 'desc' },
    });

    // Get all changedBy employee names
    const changedByIds = [...new Set(history.map((h) => h.changedById))];
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: changedByIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const employeeMap = new Map(
      employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`])
    );

    return history.map((h) => ({
      id: h.id,
      action: h.action,
      roundNumber: h.roundNumber || undefined,
      previousValue: h.previousValue || undefined,
      newValue: h.newValue || undefined,
      notes: h.notes || undefined,
      changedById: h.changedById,
      changedByName: employeeMap.get(h.changedById),
      createdAt: h.createdAt,
    }));
  }

  // Helper: Add interview history record
  private async addInterviewHistory(
    referralId: string,
    changedById: string,
    action: string,
    roundNumber: number | null,
    previousValue: string | null,
    newValue: string | null,
    notes: string | null
  ) {
    return this.prisma.interviewHistory.create({
      data: {
        referralId,
        changedById,
        action,
        roundNumber,
        previousValue,
        newValue,
        notes,
      },
    });
  }

  // ============================================
  // OFFER MANAGEMENT METHODS
  // ============================================

  // Make offer to candidate with offer letter upload
  async makeOffer(
    referralId: string,
    dto: CreateOfferDto,
    offerLetter: Express.Multer.File,
    createdById: string
  ) {
    const referral = await this.prisma.jobReferral.findUnique({
      where: { id: referralId },
    });

    if (!referral) {
      throw new NotFoundException(`Referral with ID ${referralId} not found`);
    }

    // Check if candidate can receive an offer
    const validStatuses = ['interview_cleared', 'offer_revoked'];
    if (!validStatuses.includes(referral.status)) {
      throw new BadRequestException(
        `Cannot make offer. Candidate status must be "interview_cleared" or "offer_revoked". Current status: ${referral.status}`
      );
    }

    // Check for existing pending offers
    const existingPendingOffer = await this.prisma.candidateOffer.findFirst({
      where: {
        referralId,
        status: 'pending',
      },
    });

    if (existingPendingOffer) {
      throw new BadRequestException(
        'Candidate already has a pending offer. Please revoke it before making a new one.'
      );
    }

    // Determine offer type and version
    const existingOffers = await this.prisma.candidateOffer.findMany({
      where: { referralId },
      orderBy: { version: 'desc' },
    });

    const version = existingOffers.length > 0 ? existingOffers[0].version + 1 : 1;
    const offerType: PrismaOfferType = version === 1 ? 'original' : 'revised';

    // Generate unique public token for candidate access
    const publicToken = randomBytes(32).toString('hex');

    // Create offer in PostgreSQL first (without offerLetterUrl)
    const offer = await this.prisma.candidateOffer.create({
      data: {
        referralId,
        publicToken,
        offerLetterUrl: '', // Will update after MongoDB save
        validUntil: new Date(dto.validUntil),
        status: 'pending',
        offerType,
        version,
        createdById,
      },
    });

    // Save offer letter to MongoDB
    const offerLetterDoc = new this.offerLetterModel({
      referralId,
      offerId: offer.id,
      candidateName: referral.candidateName,
      candidateEmail: referral.candidateEmail,
      filename: offerLetter.originalname,
      mimetype: offerLetter.mimetype,
      data: offerLetter.buffer,
      size: offerLetter.size,
    });
    const savedOfferLetter = await offerLetterDoc.save();

    // Update offer with MongoDB document ID
    await this.prisma.candidateOffer.update({
      where: { id: offer.id },
      data: { offerLetterUrl: savedOfferLetter._id.toString() },
    });

    // Update referral status
    await this.prisma.jobReferral.update({
      where: { id: referralId },
      data: { status: 'offer_pending' },
    });

    // Add history
    await this.addInterviewHistory(
      referralId,
      createdById,
      'offer_made',
      null,
      referral.status,
      'offer_pending',
      `Offer v${version} (${offerType}) extended to candidate. Valid until ${new Date(dto.validUntil).toLocaleDateString()}`
    );

    return {
      success: true,
      message: 'Offer created successfully',
      offerId: offer.id,
      version,
      offerType,
      publicToken,
    };
  }

  // Get offer by public token (for public access)
  async getOfferByPublicToken(publicToken: string) {
    const offer = await this.prisma.candidateOffer.findUnique({
      where: { publicToken },
      include: {
        referral: {
          include: {
            jobOpening: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found or link is invalid');
    }

    return {
      id: offer.id,
      candidateName: offer.referral.candidateName,
      candidateEmail: offer.referral.candidateEmail,
      jobTitle: offer.referral.jobOpening.title,
      companyName: 'Azul Arc', // Could be from config
      validUntil: offer.validUntil,
      status: offer.status,
      offerType: offer.offerType,
      version: offer.version,
      createdAt: offer.createdAt,
      createdBy: `${offer.createdBy.firstName} ${offer.createdBy.lastName}`,
      offerLetterUrl: offer.offerLetterUrl,
    };
  }

  // Accept offer by public token
  async acceptOfferByPublicToken(publicToken: string) {
    const offer = await this.prisma.candidateOffer.findUnique({
      where: { publicToken },
      include: {
        referral: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found or link is invalid');
    }

    if (offer.status !== 'pending') {
      throw new BadRequestException(
        `Cannot accept offer. Current status is "${offer.status}"`
      );
    }

    // Check if offer has expired
    if (new Date() > offer.validUntil) {
      // Update offer status to expired
      await this.prisma.candidateOffer.update({
        where: { id: offer.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('This offer has expired');
    }

    // Update offer status to accepted
    await this.prisma.candidateOffer.update({
      where: { id: offer.id },
      data: {
        status: 'accepted',
        respondedAt: new Date(),
      },
    });

    // Update referral status to offer_accepted
    await this.prisma.jobReferral.update({
      where: { id: offer.referralId },
      data: { status: 'offer_accepted' },
    });

    // Add history (using a system user context)
    await this.addInterviewHistory(
      offer.referralId,
      offer.createdById, // Using the offer creator as context
      'status_change',
      null,
      'offer_pending',
      'offer_accepted',
      `Candidate accepted offer v${offer.version}`
    );

    return {
      success: true,
      message: 'Offer accepted successfully! We will contact you with next steps.',
    };
  }

  // Download offer letter by public token
  async getOfferLetterByPublicToken(publicToken: string) {
    const offer = await this.prisma.candidateOffer.findUnique({
      where: { publicToken },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found or link is invalid');
    }

    const offerLetter = await this.offerLetterModel.findById(offer.offerLetterUrl);
    if (!offerLetter) {
      throw new NotFoundException('Offer letter document not found');
    }

    return {
      data: offerLetter.data,
      filename: offerLetter.filename,
      mimetype: offerLetter.mimetype,
    };
  }

  // Revoke an offer
  async revokeOffer(offerId: string, dto: RevokeOfferDto, revokedById: string) {
    const offer = await this.prisma.candidateOffer.findUnique({
      where: { id: offerId },
      include: { referral: true },
    });

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    if (offer.status !== 'pending') {
      throw new BadRequestException(
        `Cannot revoke offer with status "${offer.status}". Only pending offers can be revoked.`
      );
    }

    // Update offer status
    await this.prisma.candidateOffer.update({
      where: { id: offerId },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedById,
        revokeReason: dto.reason,
      },
    });

    // Update referral status
    await this.prisma.jobReferral.update({
      where: { id: offer.referralId },
      data: { status: 'offer_revoked' },
    });

    // Add history
    await this.addInterviewHistory(
      offer.referralId,
      revokedById,
      'offer_revoked',
      null,
      'offer_pending',
      'offer_revoked',
      dto.reason || 'Offer revoked'
    );

    return { success: true, message: 'Offer revoked successfully' };
  }

  // Get all offers for a candidate
  async getCandidateOffers(referralId: string): Promise<CandidateOffersResponse> {
    const referral = await this.prisma.jobReferral.findUnique({
      where: { id: referralId },
      include: {
        offers: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            revokedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { version: 'asc' },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException(`Referral with ID ${referralId} not found`);
    }

    const now = new Date();

    const mapOffer = (offer: any): CandidateOfferResponse => ({
      id: offer.id,
      referralId: offer.referralId,
      offerLetterUrl: offer.offerLetterUrl,
      validUntil: offer.validUntil.toISOString(),
      status: offer.status as OfferStatus,
      offerType: offer.offerType as OfferType,
      version: offer.version,
      createdById: offer.createdById,
      createdByName: `${offer.createdBy.firstName} ${offer.createdBy.lastName}`,
      respondedAt: offer.respondedAt?.toISOString(),
      revokedAt: offer.revokedAt?.toISOString(),
      revokedById: offer.revokedById,
      revokedByName: offer.revokedBy
        ? `${offer.revokedBy.firstName} ${offer.revokedBy.lastName}`
        : undefined,
      revokeReason: offer.revokeReason,
      createdAt: offer.createdAt.toISOString(),
      isExpired: offer.status === 'pending' && new Date(offer.validUntil) < now,
    });

    const originalOffers = referral.offers
      .filter((o) => o.offerType === 'original')
      .map(mapOffer);

    const revisedOffers = referral.offers
      .filter((o) => o.offerType === 'revised')
      .map(mapOffer);

    const currentOffer = referral.offers.find((o) => o.status === 'pending');

    // Can make new offer if status is interview_cleared or offer_revoked
    const canMakeNewOffer = ['interview_cleared', 'offer_revoked'].includes(referral.status);

    return {
      referralId,
      candidateName: referral.candidateName,
      candidateEmail: referral.candidateEmail,
      originalOffers,
      revisedOffers,
      currentOffer: currentOffer ? mapOffer(currentOffer) : undefined,
      canMakeNewOffer,
    };
  }

  // Download offer letter
  async getOfferLetter(offerId: string) {
    const offer = await this.prisma.candidateOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${offerId} not found`);
    }

    const offerLetter = await this.offerLetterModel.findById(offer.offerLetterUrl);

    if (!offerLetter) {
      throw new NotFoundException('Offer letter document not found');
    }

    return {
      filename: offerLetter.filename,
      mimetype: offerLetter.mimetype,
      data: offerLetter.data,
    };
  }

  // Copy offer letter to employee documents when candidate joins
  async copyOfferToEmployeeDocuments(referralId: string, employeeId: string, uploadedById: string) {
    const referral = await this.prisma.jobReferral.findUnique({
      where: { id: referralId },
      include: {
        offers: {
          where: { status: 'accepted' },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!referral || referral.offers.length === 0) {
      this.logger.warn(`No accepted offer found for referral ${referralId}`);
      return;
    }

    const acceptedOffer = referral.offers[0];
    const offerLetter = await this.offerLetterModel.findById(acceptedOffer.offerLetterUrl);

    if (!offerLetter) {
      this.logger.warn(`Offer letter not found for offer ${acceptedOffer.id}`);
      return;
    }

    // Create employee document entry pointing to the same MongoDB document
    await this.prisma.employeeDocument.create({
      data: {
        employeeId,
        category: 'EMPLOYMENT',
        documentType: 'OFFER_LETTER',
        title: 'Offer Letter',
        description: `Offer letter accepted on ${acceptedOffer.respondedAt?.toLocaleDateString() || 'N/A'}`,
        documentUrl: acceptedOffer.offerLetterUrl,
        uploadedById,
      },
    });

    this.logger.log(`Copied offer letter to employee ${employeeId} documents`);
  }

  // Onboard a candidate who accepted an offer
  async onboardCandidate(
    referralId: string,
    employeeCode: string,
    officeEmail: string,
    reportingManagerId: string,
    designationId: string | undefined,
    joiningDate: string | undefined,
    onboardedById: string,
  ) {
    // Get the referral with job opening details
    const referral = await this.prisma.jobReferral.findUnique({
      where: { id: referralId },
      include: {
        jobOpening: true,
        offers: {
          where: { status: 'accepted' },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    if (referral.status !== 'offer_accepted') {
      throw new BadRequestException(
        `Cannot onboard candidate. Status must be "offer_accepted", currently "${referral.status}"`
      );
    }

    if (referral.offers.length === 0) {
      throw new BadRequestException('No accepted offer found for this candidate');
    }

    // Check if employee code already exists
    const existingCode = await this.prisma.employee.findUnique({
      where: { employeeCode },
    });
    if (existingCode) {
      throw new BadRequestException('Employee code already exists');
    }

    // Check if office email already exists
    const existingEmail = await this.prisma.employee.findUnique({
      where: { officeEmail },
    });
    if (existingEmail) {
      throw new BadRequestException('Office email already exists');
    }

    // Parse candidate name into first and last name
    const nameParts = referral.candidateName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Find department by name from job opening
    let departmentId: string | undefined;
    if (referral.jobOpening.department) {
      const department = await this.prisma.department.findFirst({
        where: { name: referral.jobOpening.department },
      });
      departmentId = department?.id;
    }

    // Generate default password
    const defaultPassword = `Welcome@${new Date().getFullYear()}`;
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create the employee
    const employee = await this.prisma.employee.create({
      data: {
        firstName,
        lastName,
        personalEmail: referral.candidateEmail,
        officeEmail,
        phone: referral.candidatePhone,
        employeeCode,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        departmentId,
        designationId,
        reportingManager: reportingManagerId,
        employmentType: referral.jobOpening.jobType === 'full_time' ? 'Full-time' :
                        referral.jobOpening.jobType === 'part_time' ? 'Part-time' :
                        referral.jobOpening.jobType === 'contract' ? 'Contract' : 'Full-time',
        password: hashedPassword,
        isActive: true,
        status: 'active',
      },
      include: {
        department: true,
        designation: true,
      },
    });

    // Assign default employee role
    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'employee' },
    });
    if (defaultRole) {
      await this.prisma.employeeRole.create({
        data: {
          employeeId: employee.id,
          roleId: defaultRole.id,
        },
      });
    }

    // Update referral status to joined
    await this.prisma.jobReferral.update({
      where: { id: referralId },
      data: { status: 'joined' },
    });

    // Add history entry
    await this.addInterviewHistory(
      referralId,
      onboardedById,
      'status_change',
      null,
      'offer_accepted',
      'joined',
      `Candidate onboarded as employee ${employeeCode}`
    );

    // Copy offer letter to employee documents
    await this.copyOfferToEmployeeDocuments(referralId, employee.id, onboardedById);

    this.logger.log(`Candidate ${referral.candidateName} onboarded as employee ${employeeCode}`);

    return {
      success: true,
      message: 'Candidate successfully onboarded',
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        officeEmail: employee.officeEmail,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department?.name,
      },
      defaultPassword,
    };
  }

  // ============================================
  // PUBLIC JOBS METHODS (No auth required)
  // ============================================

  /**
   * Get all open jobs for public careers page
   */
  async findPublicJobs() {
    const jobs = await this.prisma.jobOpening.findMany({
      where: { status: 'open' },
      select: {
        id: true,
        title: true,
        description: true,
        department: true,
        location: true,
        jobType: true,
        experienceLevel: true,
        salaryMin: true,
        salaryMax: true,
        createdAt: true,
        closingDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return jobs;
  }

  /**
   * Get job details by ID for public view
   */
  async findPublicJobById(id: string) {
    const job = await this.prisma.jobOpening.findUnique({
      where: { id, status: 'open' },
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        responsibilities: true,
        department: true,
        location: true,
        jobType: true,
        experienceLevel: true,
        salaryMin: true,
        salaryMax: true,
        createdAt: true,
        closingDate: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found or no longer accepting applications');
    }

    return job;
  }

  /**
   * Apply for a job (public - self-application, no referral)
   */
  async applyForJob(
    jobId: string,
    data: {
      candidateName: string;
      candidateEmail: string;
      candidatePhone?: string;
      experienceYears?: number;
      linkedinUrl?: string;
      coverLetter?: string;
      resume?: Express.Multer.File;
    },
  ) {
    // Verify job exists and is open
    const job = await this.prisma.jobOpening.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== 'open') {
      throw new NotFoundException('Job not found or no longer accepting applications');
    }

    // Check if candidate already applied
    const existingApplication = await this.prisma.jobReferral.findFirst({
      where: {
        jobOpeningId: jobId,
        candidateEmail: data.candidateEmail,
      },
    });

    if (existingApplication) {
      throw new BadRequestException('You have already applied for this position');
    }

    // Save resume to MongoDB if provided
    let resumeUrl: string | null = null;
    if (data.resume) {
      const resumeDoc = await this.resumeModel.create({
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        jobOpeningId: jobId,
        fileName: data.resume.originalname,
        mimeType: data.resume.mimetype,
        fileData: data.resume.buffer,
        uploadedAt: new Date(),
      });
      resumeUrl = `mongodb://resumes/${resumeDoc._id}`;
    }

    // Create referral record (self-applied, no referrer)
    // Include linkedinUrl in notes if provided
    const notes = [data.coverLetter, data.linkedinUrl ? `LinkedIn: ${data.linkedinUrl}` : null]
      .filter(Boolean)
      .join('\n\n') || null;

    const referral = await this.prisma.jobReferral.create({
      data: {
        jobOpeningId: jobId,
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        candidatePhone: data.candidatePhone || null,
        experienceYears: data.experienceYears ?? 0,
        notes,
        resumeUrl,
        status: 'applied',
        isSelfApplied: true, // Mark as self-applied (from public careers page)
        // Self-application - we need a system user or null referrer
        // Using the first admin as a fallback
        referredById: await this.getSystemUserId(),
      },
    });

    return {
      success: true,
      message: 'Application submitted successfully! We will review your profile and get back to you.',
      applicationId: referral.id,
    };
  }

  /**
   * Get a system user ID for self-applications
   */
  private async getSystemUserId(): Promise<string> {
    // Find a super_admin or admin user to use as the referrer for self-applications
    const systemUser = await this.prisma.employee.findFirst({
      where: {
        employeeRoles: {
          some: {
            role: {
              name: { in: ['super_admin', 'admin', 'hr'] },
            },
          },
        },
      },
      select: { id: true },
    });

    if (!systemUser) {
      throw new BadRequestException('System configuration error. Please contact support.');
    }

    return systemUser.id;
  }
}

