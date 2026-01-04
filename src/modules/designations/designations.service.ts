import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateDesignationDto, UpdateDesignationDto } from './dto';

@Injectable()
export class DesignationsService {
  private readonly logger = new Logger(DesignationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDesignationDto: CreateDesignationDto) {
    try {
      const designation = await this.prisma.designation.create({
        data: createDesignationDto,
      });

      this.logger.log(`Designation created: ${designation.name} (${designation.id})`);
      return designation;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Designation with this name or code already exists');
      }
      throw error;
    }
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    
    return this.prisma.designation.findMany({
      where,
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const designation = await this.prisma.designation.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            middleName: true,
            lastName: true,
            officeEmail: true,
            department: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!designation) {
      throw new NotFoundException(`Designation with ID ${id} not found`);
    }

    return designation;
  }

  async update(id: string, updateDesignationDto: UpdateDesignationDto) {
    try {
      const designation = await this.prisma.designation.update({
        where: { id },
        data: updateDesignationDto,
      });

      this.logger.log(`Designation updated: ${designation.name} (${designation.id})`);
      return designation;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Designation with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Designation with this name or code already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const designation = await this.prisma.designation.delete({
        where: { id },
      });

      this.logger.log(`Designation deleted: ${designation.name} (${designation.id})`);
      return { message: 'Designation deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Designation with ID ${id} not found`);
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Cannot delete designation with assigned employees');
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }

  async activate(id: string) {
    return this.update(id, { isActive: true });
  }
}

