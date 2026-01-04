import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import * as bcrypt from 'bcrypt';
import { ProfilePhotosService } from '../profile-photos/profile-photos.service';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profilePhotosService: ProfilePhotosService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    this.logger.log(`Creating employee with office email: ${createEmployeeDto.officeEmail}`);

    // Check if office email already exists
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { officeEmail: createEmployeeDto.officeEmail },
    });

    if (existingEmployee) {
      throw new ConflictException('Employee with this office email already exists');
    }

    // Check if employee code already exists (if provided)
    if (createEmployeeDto.employeeCode) {
      const existingCode = await this.prisma.employee.findUnique({
        where: { employeeCode: createEmployeeDto.employeeCode },
      });

      if (existingCode) {
        throw new ConflictException('Employee with this employee code already exists');
      }
    }

    // Verify department exists (if provided)
    if (createEmployeeDto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: createEmployeeDto.departmentId },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    // Verify designation exists (if provided)
    if (createEmployeeDto.designationId) {
      const designation = await this.prisma.designation.findUnique({
        where: { id: createEmployeeDto.designationId },
      });

      if (!designation) {
        throw new NotFoundException('Designation not found');
      }
    }

    // Verify reporting manager exists (if provided)
    if (createEmployeeDto.reportingManager) {
      const manager = await this.prisma.employee.findUnique({
        where: { id: createEmployeeDto.reportingManager },
      });

      if (!manager) {
        throw new NotFoundException('Reporting manager not found');
      }
    }

    // Generate a default password (employee should reset on first login)
    // Default password format: Welcome@{year} (e.g., Welcome@2024)
    const defaultPassword = `Welcome@${new Date().getFullYear()}`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const employee = await this.prisma.employee.create({
      data: {
        ...createEmployeeDto,
        password: hashedPassword,
        joiningDate: new Date(createEmployeeDto.joiningDate),
        dateOfBirth: createEmployeeDto.dateOfBirth ? new Date(createEmployeeDto.dateOfBirth) : null,
      },
      include: {
        department: true,
        designation: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            officeEmail: true,
            designation: true,
          },
        },
      },
    });

    this.logger.log(`Employee created successfully with ID: ${employee.id}`);
    return employee;
  }

  async findAll(includeInactive = false) {
    this.logger.log('Fetching all employees');

    const where = includeInactive ? {} : { status: 'active' };

    return this.prisma.employee.findMany({
      where,
      include: {
        department: true,
        designation: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            officeEmail: true,
          },
        },
        employeeRoles: {
          include: {
            role: true,
          },
        },
        _count: {
          select: { subordinates: true },
        },
      },
      orderBy: [
        { designation: { level: 'desc' } }, // Sort by seniority (higher level = more senior)
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    this.logger.log(`Fetching employee with ID: ${id}`);

    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        designation: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            officeEmail: true,
            designation: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            officeEmail: true,
            designation: true,
          },
        },
        employeeRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    this.logger.log(`Updating employee with ID: ${id}`);

    // Check if employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if office email is being updated and already exists
    if (updateEmployeeDto.officeEmail && updateEmployeeDto.officeEmail !== employee.officeEmail) {
      const existingEmployee = await this.prisma.employee.findUnique({
        where: { officeEmail: updateEmployeeDto.officeEmail },
      });

      if (existingEmployee) {
        throw new ConflictException('Employee with this office email already exists');
      }
    }

    // Check if employee code is being updated and already exists
    if (updateEmployeeDto.employeeCode && updateEmployeeDto.employeeCode !== employee.employeeCode) {
      const existingCode = await this.prisma.employee.findUnique({
        where: { employeeCode: updateEmployeeDto.employeeCode },
      });

      if (existingCode) {
        throw new ConflictException('Employee with this employee code already exists');
      }
    }

    // Verify department exists (if being updated)
    if (updateEmployeeDto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: updateEmployeeDto.departmentId },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    // Verify designation exists (if being updated)
    if (updateEmployeeDto.designationId) {
      const designation = await this.prisma.designation.findUnique({
        where: { id: updateEmployeeDto.designationId },
      });

      if (!designation) {
        throw new NotFoundException('Designation not found');
      }
    }

    // Verify reporting manager exists (if being updated)
    if (updateEmployeeDto.reportingManager) {
      const manager = await this.prisma.employee.findUnique({
        where: { id: updateEmployeeDto.reportingManager },
      });

      if (!manager) {
        throw new NotFoundException('Reporting manager not found');
      }

      // Prevent circular reporting
      if (updateEmployeeDto.reportingManager === id) {
        throw new ConflictException('Employee cannot report to themselves');
      }
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...updateEmployeeDto,
        joiningDate: updateEmployeeDto.joiningDate ? new Date(updateEmployeeDto.joiningDate) : undefined,
        dateOfBirth: updateEmployeeDto.dateOfBirth ? new Date(updateEmployeeDto.dateOfBirth) : undefined,
      },
      include: {
        department: true,
        designation: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            officeEmail: true,
            designation: true,
          },
        },
      },
    });

    this.logger.log(`Employee updated successfully with ID: ${id}`);
    return updatedEmployee;
  }

  async remove(id: string) {
    this.logger.log(`Deleting employee with ID: ${id}`);

    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    await this.prisma.employee.delete({
      where: { id },
    });

    this.logger.log(`Employee deleted successfully with ID: ${id}`);
    return { message: 'Employee deleted successfully' };
  }

  async deactivate(id: string) {
    this.logger.log(`Deactivating employee with ID: ${id}`);

    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: { status: 'inactive' },
      include: {
        department: true,
        designation: true,
      },
    });

    this.logger.log(`Employee deactivated successfully with ID: ${id}`);
    return updatedEmployee;
  }

  async activate(id: string) {
    this.logger.log(`Activating employee with ID: ${id}`);

    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: { status: 'active' },
      include: {
        department: true,
        designation: true,
      },
    });

    this.logger.log(`Employee activated successfully with ID: ${id}`);
    return updatedEmployee;
  }

  async findByDepartment(departmentId: string) {
    this.logger.log(`Fetching employees for department: ${departmentId}`);

    return this.prisma.employee.findMany({
      where: {
        departmentId,
        status: 'active',
      },
      include: {
        designation: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            officeEmail: true,
          },
        },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });
  }

  async findByDesignation(designationId: string) {
    this.logger.log(`Fetching employees for designation: ${designationId}`);

    return this.prisma.employee.findMany({
      where: {
        designationId,
        status: 'active',
      },
      include: {
        department: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            officeEmail: true,
          },
        },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });
  }

  async uploadPhoto(id: string, file: Express.Multer.File) {
    this.logger.log(`Uploading photo for employee with ID: ${id}`);

    // Find the employee
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Store photo in MongoDB
    await this.profilePhotosService.uploadPhoto(id, file);

    // Update employee profilePhoto field with the API path to fetch the photo
    const profilePhotoPath = `api/profile-photos/${id}`;
    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: { profilePhoto: profilePhotoPath },
      include: {
        department: true,
        designation: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            officeEmail: true,
            designation: true,
          },
        },
      },
    });

    this.logger.log(`Profile photo uploaded for employee: ${id}`);

    return {
      message: 'Profile photo uploaded successfully',
      profilePhoto: updatedEmployee.profilePhoto,
      employee: updatedEmployee,
    };
  }
}
