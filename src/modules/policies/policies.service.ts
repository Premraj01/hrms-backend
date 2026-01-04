import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePolicyDto, UpdatePolicyDto, PolicyCategory } from './dto';
import {
  PolicyDocument,
  PolicyDocumentDocument,
} from './schemas/policy-document.schema';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(PolicyDocument.name)
    private policyDocumentModel: Model<PolicyDocumentDocument>,
  ) {}

  async create(createPolicyDto: CreatePolicyDto, createdById: string) {
    return this.prisma.policy.create({
      data: {
        title: createPolicyDto.title,
        description: createPolicyDto.description,
        category: createPolicyDto.category || 'GENERAL',
        version: createPolicyDto.version || '1.0',
        createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(category?: PolicyCategory, includeInactive = false) {
    return this.prisma.policy.findMany({
      where: {
        ...(category && { category }),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }

    return policy;
  }

  async update(id: string, updatePolicyDto: UpdatePolicyDto) {
    await this.findOne(id);

    return this.prisma.policy.update({
      where: { id },
      data: updatePolicyDto,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.policy.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Document handling methods
  async uploadDocument(policyId: string, file: Express.Multer.File) {
    // Verify policy exists
    const policy = await this.findOne(policyId);

    // Store document in MongoDB
    await this.policyDocumentModel.findOneAndUpdate(
      { policyId },
      {
        policyId,
        data: file.buffer,
        mimeType: file.mimetype,
        filename: file.originalname,
        size: file.size,
      },
      { upsert: true, new: true },
    );

    // Update policy with document URL
    const documentUrl = `api/policies/${policyId}/document`;
    await this.prisma.policy.update({
      where: { id: policyId },
      data: { documentUrl },
    });

    this.logger.log(`Document uploaded for policy: ${policyId}`);
    return { ...policy, documentUrl };
  }

  async getDocument(policyId: string) {
    const doc = await this.policyDocumentModel.findOne({ policyId });

    if (!doc) {
      throw new NotFoundException(
        `Document for policy ${policyId} not found`,
      );
    }

    return {
      data: doc.data,
      mimeType: doc.mimeType,
      filename: doc.filename,
    };
  }

  async deleteDocument(policyId: string) {
    const result = await this.policyDocumentModel.deleteOne({ policyId });

    if (result.deletedCount > 0) {
      await this.prisma.policy.update({
        where: { id: policyId },
        data: { documentUrl: null },
      });
    }

    return result.deletedCount > 0;
  }
}

