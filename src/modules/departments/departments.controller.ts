import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';
import { RequirePermissions, CurrentUser, CurrentUserData } from '../../common/decorators';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions('departments.create')
  create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @RequirePermissions('departments.read')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.departmentsService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @RequirePermissions('departments.read')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('departments.update')
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @RequirePermissions('departments.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.departmentsService.remove(id);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('departments.update')
  deactivate(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.departmentsService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequirePermissions('departments.update')
  activate(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.departmentsService.activate(id);
  }
}

