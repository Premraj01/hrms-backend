import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../database/prisma/prisma.service';
import { DocumentFile } from './schemas/document-file.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentCategory, DocumentType } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    @InjectModel(DocumentFile.name)
    private documentFileModel: Model<DocumentFile>,
  ) {}

  async create(
    dto: CreateDocumentDto,
    uploadedById: string,
    file?: Express.Multer.File,
  ) {
    // Create document record in PostgreSQL
    const document = await this.prisma.employeeDocument.create({
      data: {
        employeeId: dto.employeeId,
        category: dto.category,
        documentType: dto.documentType,
        title: dto.title,
        description: dto.description,
        month: dto.month,
        year: dto.year,
        uploadedById,
        documentUrl: file ? 'pending' : null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // If file provided, store in MongoDB
    if (file) {
      await this.documentFileModel.create({
        employeeDocumentId: document.id,
        filename: file.originalname,
        mimetype: file.mimetype,
        data: file.buffer,
        size: file.size,
      });

      // Update document with reference
      await this.prisma.employeeDocument.update({
        where: { id: document.id },
        data: { documentUrl: file.originalname },
      });

      return { ...document, documentUrl: file.originalname };
    }

    return document;
  }

  async findAllForEmployee(employeeId: string, requestingUserId: string, isAdmin: boolean) {
    // Non-admins can only view their own documents
    if (!isAdmin && employeeId !== requestingUserId) {
      throw new ForbiddenException('You can only view your own documents');
    }

    const documents = await this.prisma.employeeDocument.findMany({
      where: { employeeId },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ category: 'asc' }, { documentType: 'asc' }, { year: 'desc' }, { month: 'desc' }],
    });

    return documents;
  }

  async findOne(id: string, requestingUserId: string, isAdmin: boolean) {
    const document = await this.prisma.employeeDocument.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Non-admins can only view their own documents
    if (!isAdmin && document.employeeId !== requestingUserId) {
      throw new ForbiddenException('You can only view your own documents');
    }

    return document;
  }

  async update(id: string, dto: UpdateDocumentDto, requestingUserId: string, isAdmin: boolean) {
    const document = await this.findOne(id, requestingUserId, isAdmin);

    // Only admins can update documents
    if (!isAdmin) {
      throw new ForbiddenException('Only administrators can update documents');
    }

    return this.prisma.employeeDocument.update({
      where: { id },
      data: dto,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async remove(id: string, requestingUserId: string, isAdmin: boolean) {
    const document = await this.findOne(id, requestingUserId, isAdmin);

    // Only admins can delete documents
    if (!isAdmin) {
      throw new ForbiddenException('Only administrators can delete documents');
    }

    // Delete file from MongoDB
    await this.documentFileModel.deleteOne({ employeeDocumentId: id });

    // Delete record from PostgreSQL
    return this.prisma.employeeDocument.delete({ where: { id } });
  }

  async uploadFile(id: string, file: Express.Multer.File, requestingUserId: string, isAdmin: boolean) {
    const document = await this.findOne(id, requestingUserId, isAdmin);

    if (!isAdmin) {
      throw new ForbiddenException('Only administrators can upload documents');
    }

    // Delete existing file if any
    await this.documentFileModel.deleteOne({ employeeDocumentId: id });

    // Store new file
    await this.documentFileModel.create({
      employeeDocumentId: id,
      filename: file.originalname,
      mimetype: file.mimetype,
      data: file.buffer,
      size: file.size,
    });

    // Update document reference
    return this.prisma.employeeDocument.update({
      where: { id },
      data: { documentUrl: file.originalname },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async getFile(id: string, requestingUserId: string, isAdmin: boolean) {
    const document = await this.findOne(id, requestingUserId, isAdmin);

    if (!document.documentUrl) {
      throw new NotFoundException('No file attached to this document');
    }

    const file = await this.documentFileModel.findOne({ employeeDocumentId: id });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return {
      filename: file.filename,
      mimetype: file.mimetype,
      data: file.data,
      size: file.size,
    };
  }

  async getDocumentTypes() {
    return {
      categories: Object.values(DocumentCategory),
      types: Object.values(DocumentType),
      typesByCategory: {
        [DocumentCategory.EMPLOYMENT]: [
          DocumentType.OFFER_LETTER,
          DocumentType.JOINING_LETTER,
        ],
        [DocumentCategory.PAYROLL]: [
          DocumentType.PAYSLIP,
          DocumentType.APPRAISAL_LETTER,
          DocumentType.FORM_16,
        ],
      },
    };
  }
}

