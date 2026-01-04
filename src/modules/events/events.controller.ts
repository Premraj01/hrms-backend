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
  Logger,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  /**
   * Create a new event
   */
  @Post()
  @Roles('super_admin', 'admin', 'hr')
  async create(@Body() createEventDto: CreateEventDto, @Request() req) {
    this.logger.log(`Creating event by user: ${req.user.id}`);
    return this.eventsService.create(createEventDto, req.user.id);
  }

  /**
   * Get all events
   */
  @Get()
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    return this.eventsService.findAll(includeInactive);
  }

  /**
   * Get upcoming events
   */
  @Get('upcoming')
  async findUpcoming(@Query('limit') limit?: number) {
    return this.eventsService.findUpcoming(limit || 10);
  }

  /**
   * Get events by type
   */
  @Get('type/:type')
  async findByType(@Param('type') type: string) {
    return this.eventsService.findByType(type);
  }

  /**
   * Get a single event
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  /**
   * Update an event
   */
  @Put(':id')
  @Roles('super_admin', 'admin', 'hr')
  async update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  /**
   * Delete an event (soft delete)
   */
  @Delete(':id')
  @Roles('super_admin', 'admin', 'hr')
  async delete(@Param('id') id: string) {
    return this.eventsService.update(id, { isActive: false } as any);
  }
}

