import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { DocumentCategory, DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @IsUUID()
  employeeId: string;

  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;
}

