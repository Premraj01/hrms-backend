import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateHolidayDto, UpdateHolidayDto } from './dto';

@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createHolidayDto: CreateHolidayDto, createdById: string) {
    const date = new Date(createHolidayDto.date);
    const year = date.getFullYear();

    // Check for duplicate holiday on same date and country
    const existing = await this.prisma.holiday.findFirst({
      where: {
        date,
        country: createHolidayDto.country,
      },
    });

    if (existing) {
      throw new ConflictException(`A holiday already exists on this date for ${createHolidayDto.country.toUpperCase()}`);
    }

    return this.prisma.holiday.create({
      data: {
        title: createHolidayDto.title,
        description: createHolidayDto.description,
        date,
        country: createHolidayDto.country,
        year,
        createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(country?: string, year?: number, includeInactive = false) {
    const currentYear = year || new Date().getFullYear();

    return this.prisma.holiday.findMany({
      where: {
        ...(country && { country }),
        year: currentYear,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async findUpcoming(country?: string, limit = 10) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.holiday.findMany({
      where: {
        date: { gte: today },
        isActive: true,
        ...(country && { country }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: 'asc' },
      take: limit,
    });
  }

  async findOne(id: string) {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!holiday) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }

    return holiday;
  }

  async update(id: string, updateHolidayDto: UpdateHolidayDto) {
    await this.findOne(id);

    const updateData: any = { ...updateHolidayDto };
    if (updateHolidayDto.date) {
      updateData.date = new Date(updateHolidayDto.date);
      updateData.year = updateData.date.getFullYear();
    }

    return this.prisma.holiday.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.holiday.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

