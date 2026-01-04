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
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto, UpdateHolidayDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HolidaysController {
  private readonly logger = new Logger(HolidaysController.name);

  constructor(private readonly holidaysService: HolidaysService) {}

  /**
   * Create a new holiday
   */
  @Post()
  @Roles('super_admin', 'admin', 'hr')
  async create(@Body() createHolidayDto: CreateHolidayDto, @Request() req) {
    this.logger.log(`Creating holiday by user: ${req.user.id}`);
    return this.holidaysService.create(createHolidayDto, req.user.id);
  }

  /**
   * Get all holidays for a year
   */
  @Get()
  async findAll(
    @Query('country') country?: string,
    @Query('year') year?: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.holidaysService.findAll(
      country,
      year ? parseInt(year, 10) : undefined,
      includeInactive,
    );
  }

  /**
   * Get upcoming holidays
   */
  @Get('upcoming')
  async findUpcoming(
    @Query('country') country?: string,
    @Query('limit') limit?: string,
  ) {
    return this.holidaysService.findUpcoming(
      country,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Get a single holiday
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.holidaysService.findOne(id);
  }

  /**
   * Update a holiday
   */
  @Put(':id')
  @Roles('super_admin', 'admin', 'hr')
  async update(
    @Param('id') id: string,
    @Body() updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.holidaysService.update(id, updateHolidayDto);
  }

  /**
   * Delete a holiday (soft delete)
   */
  @Delete(':id')
  @Roles('super_admin', 'admin', 'hr')
  async remove(@Param('id') id: string) {
    return this.holidaysService.remove(id);
  }
}

