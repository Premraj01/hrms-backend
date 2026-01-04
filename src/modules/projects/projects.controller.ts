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
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, AddProjectMemberDto, UpdateProjectMemberDto } from './dto';
import { RequirePermissions, CurrentUser, CurrentUserData } from '../../common/decorators';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermissions('projects.create')
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @RequirePermissions('projects.read')
  findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('productId') productId?: string,
  ) {
    return this.projectsService.findAll(includeInactive === 'true', productId);
  }

  @Get(':id')
  @RequirePermissions('projects.read')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.remove(id);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('projects.update')
  deactivate(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequirePermissions('projects.update')
  activate(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.activate(id);
  }

  // Project Members endpoints
  @Get(':id/members')
  @RequirePermissions('projects.read')
  getMembers(
    @Param('id') id: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.projectsService.getMembers(id, includeInactive === 'true');
  }

  @Post(':id/members')
  @RequirePermissions('projects.update')
  addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddProjectMemberDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.projectsService.addMember(id, addMemberDto, user.id);
  }

  @Patch(':id/members/:memberId')
  @RequirePermissions('projects.update')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateProjectMemberDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.projectsService.updateMember(id, memberId, updateMemberDto);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions('projects.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.projectsService.removeMember(id, memberId);
  }
}

