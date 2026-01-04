import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseBoolPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { multerConfig } from '../../config/multer.config';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions('employees.create')
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @RequirePermissions('employees.read')
  findAll(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ) {
    return this.employeesService.findAll(includeInactive);
  }

  @Get('department/:departmentId')
  @RequirePermissions('employees.read')
  findByDepartment(@Param('departmentId') departmentId: string) {
    return this.employeesService.findByDepartment(departmentId);
  }

  @Get('designation/:designationId')
  @RequirePermissions('employees.read')
  findByDesignation(@Param('designationId') designationId: string) {
    return this.employeesService.findByDesignation(designationId);
  }

  @Get(':id')
  @RequirePermissions('employees.read')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('employees.update')
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('employees.update')
  deactivate(@Param('id') id: string) {
    return this.employeesService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequirePermissions('employees.update')
  activate(@Param('id') id: string) {
    return this.employeesService.activate(id);
  }

  @Delete(':id')
  @RequirePermissions('employees.delete')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Post(':id/photo')
  @RequirePermissions('employees.update')
  @UseInterceptors(FileInterceptor('photo', multerConfig))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.employeesService.uploadPhoto(id, file);
  }
}

