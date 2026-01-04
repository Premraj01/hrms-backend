import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new event
   */
  async create(createEventDto: CreateEventDto, createdById: string) {
    this.logger.log(`Creating event: ${createEventDto.title}`);

    return this.prisma.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        type: createEventDto.type || 'meeting',
        date: new Date(createEventDto.date),
        time: createEventDto.time,
        endDate: createEventDto.endDate ? new Date(createEventDto.endDate) : null,
        endTime: createEventDto.endTime,
        location: createEventDto.location,
        isAllDay: createEventDto.isAllDay || false,
        createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });
  }

  /**
   * Get all events
   */
  async findAll(includeInactive = false) {
    this.logger.log('Fetching all events');

    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.event.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });
  }

  /**
   * Get upcoming events
   */
  async findUpcoming(limit = 10) {
    this.logger.log('Fetching upcoming events');

    return this.prisma.event.findMany({
      where: {
        isActive: true,
        date: {
          gte: new Date(),
        },
      },
      orderBy: { date: 'asc' },
      take: limit,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });
  }

  /**
   * Get events by type
   */
  async findByType(type: string) {
    this.logger.log(`Fetching events of type: ${type}`);

    return this.prisma.event.findMany({
      where: {
        type,
        isActive: true,
      },
      orderBy: { date: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });
  }

  /**
   * Get a single event
   */
  async findOne(id: string) {
    this.logger.log(`Fetching event: ${id}`);

    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  /**
   * Update an event
   */
  async update(id: string, updateEventDto: UpdateEventDto) {
    this.logger.log(`Updating event: ${id}`);

    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...updateEventDto,
        date: updateEventDto.date ? new Date(updateEventDto.date) : undefined,
        endDate: updateEventDto.endDate ? new Date(updateEventDto.endDate) : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });
  }
}

