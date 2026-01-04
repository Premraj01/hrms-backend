import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ShoutoutsService } from './shoutouts.service';
import { CreateShoutoutDto } from './dto/create-shoutout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ShoutoutType } from './schemas/shoutout.schema';

@Controller('shoutouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShoutoutsController {
  private readonly logger = new Logger(ShoutoutsController.name);

  constructor(private readonly shoutoutsService: ShoutoutsService) {}

  /**
   * Create a new shoutout
   */
  @Post()
  @Roles('super_admin', 'admin', 'hr', 'manager')
  async create(@Body() createShoutoutDto: CreateShoutoutDto, @Request() req) {
    this.logger.log(`Creating shoutout by user: ${req.user.id}`);

    const givenById = req.user.id;
    const givenByName = `${req.user.firstName} ${req.user.lastName}`;
    const givenByPhoto = req.user.profilePhoto;

    return this.shoutoutsService.create(
      createShoutoutDto,
      givenById,
      givenByName,
      givenByPhoto,
    );
  }

  /**
   * Get all shoutouts
   */
  @Get()
  async findAll(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    return this.shoutoutsService.findAll(limit || 50, skip || 0);
  }

  /**
   * Get recent shoutouts for dashboard
   */
  @Get('recent')
  async findRecent(@Query('limit') limit?: number) {
    return this.shoutoutsService.findRecent(limit || 10);
  }

  /**
   * Get shoutouts by type
   */
  @Get('type/:type')
  async findByType(
    @Param('type') type: ShoutoutType,
    @Query('limit') limit?: number,
  ) {
    return this.shoutoutsService.findByType(type, limit || 20);
  }

  /**
   * Get shoutouts received by an employee
   */
  @Get('recipient/:recipientId')
  async findByRecipient(@Param('recipientId') recipientId: string) {
    return this.shoutoutsService.findByRecipient(recipientId);
  }

  /**
   * Get shoutouts given by the current user
   */
  @Get('my-given')
  async findMyGiven(@Request() req) {
    return this.shoutoutsService.findByGiver(req.user.id);
  }

  /**
   * Get shoutouts received by the current user
   */
  @Get('my-received')
  async findMyReceived(@Request() req) {
    return this.shoutoutsService.findByRecipient(req.user.id);
  }

  /**
   * Get shoutouts for a project
   */
  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.shoutoutsService.findByProject(projectId);
  }

  /**
   * Get a single shoutout
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shoutoutsService.findOne(id);
  }

  /**
   * Delete a shoutout
   */
  @Delete(':id')
  @Roles('super_admin', 'admin', 'hr')
  async delete(@Param('id') id: string) {
    return this.shoutoutsService.delete(id);
  }
}

