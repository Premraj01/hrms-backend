import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto, AddProjectMemberDto, UpdateProjectMemberDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    try {
      // Verify product exists
      const product = await this.prisma.product.findUnique({
        where: { id: createProjectDto.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${createProjectDto.productId} not found`);
      }

      const project = await this.prisma.project.create({
        data: createProjectDto,
        include: { product: true },
      });

      this.logger.log(`Project created: ${project.name} (${project.id})`);
      return project;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Project with this code already exists');
      }
      throw error;
    }
  }

  async findAll(includeInactive = false, productId?: string) {
    const where: any = includeInactive ? {} : { isActive: true };
    if (productId) {
      where.productId = productId;
    }

    return this.prisma.project.findMany({
      where,
      include: {
        product: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: [{ product: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        product: true,
        members: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                middleName: true,
                lastName: true,
                officeEmail: true,
                profilePhoto: true,
                designation: true,
                department: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    try {
      if (updateProjectDto.productId) {
        const product = await this.prisma.product.findUnique({
          where: { id: updateProjectDto.productId },
        });
        if (!product) {
          throw new NotFoundException(`Product with ID ${updateProjectDto.productId} not found`);
        }
      }

      const project = await this.prisma.project.update({
        where: { id },
        data: updateProjectDto,
        include: { product: true },
      });

      this.logger.log(`Project updated: ${project.name} (${project.id})`);
      return project;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Project with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Project with this code already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const project = await this.prisma.project.delete({
        where: { id },
      });

      this.logger.log(`Project deleted: ${project.name} (${project.id})`);
      return { message: 'Project deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Project with ID ${id} not found`);
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

  // Project Members Management
  async addMember(projectId: string, addMemberDto: AddProjectMemberDto, addedByEmployeeId?: string) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({ where: { id: addMemberDto.employeeId } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${addMemberDto.employeeId} not found`);
    }

    try {
      const member = await this.prisma.projectMember.create({
        data: {
          projectId,
          ...addMemberDto,
        },
        include: {
          employee: {
            select: {
              id: true, employeeCode: true, firstName: true, middleName: true,
              lastName: true, officeEmail: true, profilePhoto: true, designation: true, department: true,
            },
          },
        },
      });
      this.logger.log(`Member added to project ${projectId}: ${employee.firstName} ${employee.lastName}`);

      // Send notification to the added employee
      await this.sendProjectAssignedNotification(
        project,
        employee,
        addMemberDto.role || 'member',
        addMemberDto.allocation || 100,
        addedByEmployeeId || employee.id,
      );

      return member;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Employee is already a member of this project');
      }
      throw error;
    }
  }

  /**
   * Send notification when an employee is added to a project
   */
  private async sendProjectAssignedNotification(
    project: { id: string; name: string },
    employee: { id: string; firstName: string; lastName: string },
    role: string,
    allocation: number,
    addedByEmployeeId: string,
  ) {
    try {
      const roleLabels: Record<string, string> = {
        'project-manager': 'Project Manager',
        'tech-lead': 'Tech Lead',
        'developer': 'Developer',
        'qa': 'QA Engineer',
        'member': 'Team Member',
      };
      const roleLabel = roleLabels[role] || 'Team Member';

      const notification = await this.notificationsService.create({
        type: NotificationType.PROJECT_ASSIGNED,
        recipientId: employee.id,
        senderId: addedByEmployeeId,
        title: 'Added to Project',
        message: `You have been added to project "${project.name}" as ${roleLabel} with ${allocation}% allocation.`,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          projectRole: role,
          allocation: allocation,
        },
      });

      // Send real-time notification
      this.notificationsGateway.sendNotificationToUser(employee.id, notification);
      await this.notificationsGateway.updateUnreadCount(employee.id);

      this.logger.log(`Project assignment notification sent to ${employee.firstName} ${employee.lastName}`);
    } catch (error) {
      this.logger.error(`Failed to send project assignment notification: ${error.message}`);
      // Don't throw - notification failure shouldn't fail the member addition
    }
  }

  async updateMember(projectId: string, memberId: string, updateMemberDto: UpdateProjectMemberDto) {
    try {
      const member = await this.prisma.projectMember.update({
        where: { id: memberId, projectId },
        data: updateMemberDto,
        include: {
          employee: {
            select: {
              id: true, employeeCode: true, firstName: true, middleName: true,
              lastName: true, officeEmail: true, profilePhoto: true, designation: true, department: true,
            },
          },
        },
      });
      this.logger.log(`Member updated in project ${projectId}: ${memberId}`);
      return member;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Project member with ID ${memberId} not found`);
      }
      throw error;
    }
  }

  async removeMember(projectId: string, memberId: string) {
    try {
      await this.prisma.projectMember.delete({
        where: { id: memberId, projectId },
      });
      this.logger.log(`Member removed from project ${projectId}: ${memberId}`);
      return { message: 'Member removed successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Project member with ID ${memberId} not found`);
      }
      throw error;
    }
  }

  async getMembers(projectId: string, includeInactive = false) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const where: any = { projectId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.projectMember.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, middleName: true,
            lastName: true, officeEmail: true, profilePhoto: true, designation: true, department: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }
}

