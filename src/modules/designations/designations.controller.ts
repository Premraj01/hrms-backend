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
import { DesignationsService } from './designations.service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto';
import { RequirePermissions, CurrentUser, CurrentUserData } from '../../common/decorators';

@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  @RequirePermissions('designations.create')
  create(
    @Body() createDesignationDto: CreateDesignationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.designationsService.create(createDesignationDto);
  }

  @Get()
  @RequirePermissions('designations.read')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.designationsService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @RequirePermissions('designations.read')
  findOne(@Param('id') id: string) {
    return this.designationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('designations.update')
  update(
    @Param('id') id: string,
    @Body() updateDesignationDto: UpdateDesignationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.designationsService.update(id, updateDesignationDto);
  }

  @Delete(':id')
  @RequirePermissions('designations.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.designationsService.remove(id);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('designations.update')
  deactivate(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.designationsService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequirePermissions('designations.update')
  activate(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.designationsService.activate(id);
  }
}

