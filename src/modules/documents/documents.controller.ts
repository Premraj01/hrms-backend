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
  UseInterceptors,
  UploadedFile,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  private isAdmin(user: CurrentUserData): boolean {
    const roles = user.roles || [];
    return roles.some((r: any) =>
      ['super_admin', 'admin', 'hr'].includes(typeof r === 'string' ? r : r.role?.name || r.name),
    );
  }

  @Post()
  @Roles('super_admin', 'admin', 'hr')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.create(dto, user.id, file);
  }

  @Get('types')
  getDocumentTypes() {
    return this.documentsService.getDocumentTypes();
  }

  @Get('my')
  findMyDocuments(@CurrentUser() user: CurrentUserData) {
    return this.documentsService.findAllForEmployee(user.id, user.id, this.isAdmin(user));
  }

  @Get('employee/:employeeId')
  findEmployeeDocuments(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.findAllForEmployee(employeeId, user.id, this.isAdmin(user));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserData) {
    return this.documentsService.findOne(id, user.id, this.isAdmin(user));
  }

  @Put(':id')
  @Roles('super_admin', 'admin', 'hr')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.update(id, dto, user.id, this.isAdmin(user));
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'hr')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserData) {
    return this.documentsService.remove(id, user.id, this.isAdmin(user));
  }

  @Post(':id/file')
  @Roles('super_admin', 'admin', 'hr')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.documentsService.uploadFile(id, file, user.id, this.isAdmin(user));
  }

  @Get(':id/file')
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ) {
    const file = await this.documentsService.getFile(id, user.id, this.isAdmin(user));
    res.set({
      'Content-Type': file.mimetype,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': file.size,
    });
    res.send(file.data);
  }
}

