import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Response,
  Logger,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response as ExpressResponse } from 'express';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto, UpdatePolicyDto, PolicyCategory } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { memoryStorage } from 'multer';

@Controller('policies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PoliciesController {
  private readonly logger = new Logger(PoliciesController.name);

  constructor(private readonly policiesService: PoliciesService) {}

  /**
   * Create a new policy (Admin only)
   */
  @Post()
  @Roles('super_admin', 'admin', 'hr')
  async create(@Body() createPolicyDto: CreatePolicyDto, @Request() req) {
    this.logger.log(`Creating policy by user: ${req.user.id}`);
    return this.policiesService.create(createPolicyDto, req.user.id);
  }

  /**
   * Get all policies (All authenticated users)
   */
  @Get()
  async findAll(
    @Query('category') category?: PolicyCategory,
    @Query('includeInactive') includeInactive?: boolean,
    @Request() req?,
  ) {
    // Only admins can see inactive policies
    const canSeeInactive =
      req?.user?.roles?.some((r: any) =>
        ['super_admin', 'admin', 'hr'].includes(r.role?.name || r.name),
      ) && includeInactive;

    return this.policiesService.findAll(category, canSeeInactive);
  }

  /**
   * Get a single policy
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.policiesService.findOne(id);
  }

  /**
   * Update a policy (Admin only)
   */
  @Put(':id')
  @Roles('super_admin', 'admin', 'hr')
  async update(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
  ) {
    return this.policiesService.update(id, updatePolicyDto);
  }

  /**
   * Delete a policy (Admin only - soft delete)
   */
  @Delete(':id')
  @Roles('super_admin', 'admin', 'hr')
  async remove(@Param('id') id: string) {
    return this.policiesService.remove(id);
  }

  /**
   * Upload a document for a policy (Admin only)
   */
  @Post(':id/document')
  @Roles('super_admin', 'admin', 'hr')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /(pdf|doc|docx|txt|xlsx|xls)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    this.logger.log(`Uploading document for policy: ${id}`);
    return this.policiesService.uploadDocument(id, file);
  }

  /**
   * Download/Get a policy document (All authenticated users)
   */
  @Get(':id/document')
  async getDocument(
    @Param('id') id: string,
    @Response() res: ExpressResponse,
  ) {
    const doc = await this.policiesService.getDocument(id);

    res.set({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `attachment; filename="${doc.filename}"`,
      'Content-Length': doc.data.length,
    });

    res.send(doc.data);
  }

  /**
   * Delete a policy document (Admin only)
   */
  @Delete(':id/document')
  @Roles('super_admin', 'admin', 'hr')
  async deleteDocument(@Param('id') id: string) {
    const deleted = await this.policiesService.deleteDocument(id);
    return { deleted };
  }
}

