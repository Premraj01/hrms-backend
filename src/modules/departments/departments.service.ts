import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    try {
      const department = await this.prisma.department.create({
        data: createDepartmentDto,
      });

      this.logger.log(`Department created: ${department.name} (${department.id})`);
      return department;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Department with this name or code already exists');
      }
      throw error;
    }
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    
    return this.prisma.department.findMany({
      where,
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
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
            designation: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    try {
      const department = await this.prisma.department.update({
        where: { id },
        data: updateDepartmentDto,
      });

      this.logger.log(`Department updated: ${department.name} (${department.id})`);
      return department;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Department with this name or code already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const department = await this.prisma.department.delete({
        where: { id },
      });

      this.logger.log(`Department deleted: ${department.name} (${department.id})`);
      return { message: 'Department deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }
      if (error.code === 'P2003') {
        throw new ConflictException('Cannot delete department with assigned employees');
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

