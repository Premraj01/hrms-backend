import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateLeaveDto, UpdateLeaveDto, ApproveLeaveDto, RejectLeaveDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class LeavesService {
  private readonly logger = new Logger(LeavesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(employeeId: string, createLeaveDto: CreateLeaveDto) {
    this.logger.log(`Creating leave request for employee: ${employeeId}`);

    // Validate dates
    const startDate = new Date(createLeaveDto.startDate);
    const endDate = new Date(createLeaveDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const leave = await this.prisma.leave.create({
      data: {
        employeeId,
        leaveType: createLeaveDto.leaveType,
        startDate,
        endDate,
        days: createLeaveDto.days,
        reason: createLeaveDto.reason,
        status: 'pending',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
            profilePhoto: true,
            reportingManager: true,
            departmentId: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    this.logger.log(`Leave request created successfully with ID: ${leave.id}`);

    // Send notifications
    await this.sendLeaveAppliedNotifications(leave);

    return leave;
  }

  async findAll(status?: string) {
    this.logger.log(`Fetching all leaves${status ? ` with status: ${status}` : ''}`);

    const where = status ? { status } : {};

    return this.prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
            profilePhoto: true,
            reportingManager: true,
            department: true,
            designation: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                officeEmail: true,
              },
            },
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findTodaysLeaves() {
    this.logger.log('Fetching today\'s leaves');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.leave.findMany({
      where: {
        status: 'approved',
        startDate: {
          lte: tomorrow,
        },
        endDate: {
          gte: today,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
            profilePhoto: true,
            reportingManager: true,
            department: true,
            designation: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                officeEmail: true,
              },
            },
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findOne(id: string) {
    this.logger.log(`Fetching leave with ID: ${id}`);

    const leave = await this.prisma.leave.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
            profilePhoto: true,
            department: true,
            designation: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
          },
        },
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    return leave;
  }

  async findByEmployee(employeeId: string) {
    this.logger.log(`Fetching leaves for employee: ${employeeId}`);

    return this.prisma.leave.findMany({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
            profilePhoto: true,
            reportingManager: true,
            department: true,
            designation: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                officeEmail: true,
              },
            },
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, updateLeaveDto: UpdateLeaveDto) {
    this.logger.log(`Updating leave with ID: ${id}`);

    const leave = await this.prisma.leave.findUnique({ where: { id } });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== 'pending') {
      throw new BadRequestException('Only pending leave requests can be updated');
    }

    return this.prisma.leave.update({
      where: { id },
      data: updateLeaveDto,
    });
  }

  async updateMyLeave(id: string, employeeId: string, updateLeaveDto: UpdateLeaveDto) {
    this.logger.log(`Employee ${employeeId} updating their leave with ID: ${id}`);

    const leave = await this.prisma.leave.findUnique({ where: { id } });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    // Check if the leave belongs to the current user
    if (leave.employeeId !== employeeId) {
      throw new ForbiddenException('You can only update your own leave requests');
    }

    if (leave.status !== 'pending') {
      throw new BadRequestException('Only pending leave requests can be updated');
    }

    return this.prisma.leave.update({
      where: { id },
      data: updateLeaveDto,
    });
  }

  async canApproveLeave(leaveId: string, userId: string, userPermissions: string[]): Promise<boolean> {
    this.logger.log(`Checking if user ${userId} can approve leave ${leaveId}`);

    const leave = await this.prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          select: {
            reportingManager: true,
          },
        },
      },
    });

    if (!leave) {
      return false;
    }

    // User can approve if they are the manager OR have leave.update permission
    const isManager = leave.employee.reportingManager === userId;
    const hasPermission = userPermissions.includes('leave.update');

    return isManager || hasPermission;
  }

  async approve(id: string, approverId: string, approveLeaveDto?: ApproveLeaveDto) {
    this.logger.log(`Approving leave with ID: ${id} by approver: ${approverId}`);

    const leave = await this.prisma.leave.findUnique({
      where: { id },
      include: {
        employee: true,
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== 'pending') {
      throw new BadRequestException('Only pending leave requests can be approved');
    }

    // Check if approver is the manager of the employee
    // Managers can approve their subordinates' leaves without needing leave.update permission
    const isManager = leave.employee.reportingManager === approverId;

    if (!isManager) {
      // If not a manager, they need leave.update permission (checked by controller)
      this.logger.log(`Approver ${approverId} is not the manager of employee ${leave.employeeId}, permission check required`);
    } else {
      this.logger.log(`Approver ${approverId} is the manager of employee ${leave.employeeId}`);
    }

    const updatedLeave = await this.prisma.leave.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
            department: true,
            designation: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
          },
        },
      },
    });

    this.logger.log(`Leave approved successfully with ID: ${id}`);

    // Send approval notification
    await this.sendLeaveApprovedNotification(updatedLeave);

    return updatedLeave;
  }

  async reject(id: string, approverId: string, rejectLeaveDto: RejectLeaveDto) {
    this.logger.log(`Rejecting leave with ID: ${id} by approver: ${approverId}`);

    const leave = await this.prisma.leave.findUnique({
      where: { id },
      include: {
        employee: true,
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== 'pending') {
      throw new BadRequestException('Only pending leave requests can be rejected');
    }

    // Check if approver is the manager of the employee
    // Managers can reject their subordinates' leaves without needing leave.update permission
    const isManager = leave.employee.reportingManager === approverId;

    if (!isManager) {
      // If not a manager, they need leave.update permission (checked by controller)
      this.logger.log(`Approver ${approverId} is not the manager of employee ${leave.employeeId}, permission check required`);
    } else {
      this.logger.log(`Approver ${approverId} is the manager of employee ${leave.employeeId}`);
    }

    const updatedLeave = await this.prisma.leave.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: rejectLeaveDto.rejectionReason,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
            department: true,
            designation: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
          },
        },
      },
    });

    this.logger.log(`Leave rejected successfully with ID: ${id}`);

    // Send rejection notification
    await this.sendLeaveRejectedNotification(updatedLeave);

    return updatedLeave;
  }

  async delete(id: string) {
    this.logger.log(`Deleting leave with ID: ${id}`);

    const leave = await this.prisma.leave.findUnique({ where: { id } });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    await this.prisma.leave.delete({ where: { id } });

    this.logger.log(`Leave deleted successfully with ID: ${id}`);
    return { message: 'Leave request deleted successfully' };
  }

  async withdrawMyLeave(id: string, employeeId: string) {
    this.logger.log(`Employee ${employeeId} withdrawing their leave with ID: ${id}`);

    const leave = await this.prisma.leave.findUnique({ where: { id } });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    // Check if the leave belongs to the current user
    if (leave.employeeId !== employeeId) {
      throw new ForbiddenException('You can only withdraw your own leave requests');
    }

    // Only allow withdrawing pending leaves
    if (leave.status !== 'pending') {
      throw new BadRequestException('Only pending leave requests can be withdrawn');
    }

    await this.prisma.leave.delete({ where: { id } });

    this.logger.log(`Leave withdrawn successfully with ID: ${id}`);
    return { message: 'Leave request withdrawn successfully' };
  }

  // Leave Balance methods
  async getLeaveBalances(employeeId: string, year?: number) {
    this.logger.log(`Fetching leave balances for employee: ${employeeId}`);

    const currentYear = year || new Date().getFullYear();

    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        employeeId,
        year: currentYear,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
          },
        },
      },
      orderBy: {
        leaveType: 'asc',
      },
    });

    this.logger.log(`Found ${balances.length} leave balance records`);
    return balances;
  }

  async getAllLeaveBalances(year?: number) {
    this.logger.log('Fetching all leave balances');

    const currentYear = year || new Date().getFullYear();

    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        year: currentYear,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
            department: true,
            designation: true,
          },
        },
      },
      orderBy: [
        {
          employee: {
            firstName: 'asc',
          },
        },
        {
          leaveType: 'asc',
        },
      ],
    });

    this.logger.log(`Found ${balances.length} leave balance records`);
    return balances;
  }

  async getLeaveBalanceByType(employeeId: string, leaveType: string, year?: number) {
    this.logger.log(`Fetching ${leaveType} leave balance for employee: ${employeeId}`);

    const currentYear = year || new Date().getFullYear();

    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId,
          leaveType,
          year: currentYear,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
          },
        },
      },
    });

    if (!balance) {
      throw new NotFoundException(`Leave balance not found for type: ${leaveType}`);
    }

    return balance;
  }

  /**
   * Send notifications when leave is applied
   */
  private async sendLeaveAppliedNotifications(leave: any) {
    try {
      const employeeName = `${leave.employee.firstName} ${leave.employee.lastName}`;
      const departmentName = leave.employee.department?.name || 'Unknown';

      // 1. Notify manager if exists
      if (leave.employee.reportingManager) {
        const managerNotification = await this.notificationsService.create({
          type: NotificationType.LEAVE_APPLIED,
          recipientId: leave.employee.reportingManager,
          senderId: leave.employeeId,
          title: 'New Leave Request',
          message: `${employeeName} has applied for ${leave.leaveType} leave`,
          metadata: {
            leaveId: leave.id,
            leaveType: leave.leaveType,
            startDate: leave.startDate.toISOString(),
            endDate: leave.endDate.toISOString(),
            days: leave.days,
            reason: leave.reason,
            employeeName,
            department: departmentName,
          },
        });

        // Send real-time notification to manager
        this.notificationsGateway.sendNotificationToUser(
          leave.employee.reportingManager,
          managerNotification,
        );
      }

      // 2. Notify department members (excluding the applicant)
      if (leave.employee.departmentId) {
        const departmentEmployees = await this.prisma.employee.findMany({
          where: {
            departmentId: leave.employee.departmentId,
            id: { not: leave.employeeId },
            isActive: true,
          },
          select: { id: true },
        });

        const departmentNotifications = departmentEmployees.map(emp => ({
          type: NotificationType.DEPARTMENT_LEAVE,
          recipientId: emp.id,
          senderId: leave.employeeId,
          title: 'Department Leave Notice',
          message: `${employeeName} from your department is on ${leave.leaveType} leave`,
          metadata: {
            leaveId: leave.id,
            leaveType: leave.leaveType,
            startDate: leave.startDate.toISOString(),
            endDate: leave.endDate.toISOString(),
            days: leave.days,
            employeeName,
            department: departmentName,
          },
        }));

        if (departmentNotifications.length > 0) {
          const createdNotifications = await this.notificationsService.createMany(
            departmentNotifications,
          );

          // Send real-time notifications to department members
          departmentEmployees.forEach((emp, index) => {
            this.notificationsGateway.sendNotificationToUser(
              emp.id,
              createdNotifications[index],
            );
          });
        }
      }

      this.logger.log(`Notifications sent for leave application ${leave.id}`);
    } catch (error) {
      this.logger.error(`Failed to send leave applied notifications: ${error.message}`);
    }
  }

  /**
   * Send notification when leave is approved
   */
  private async sendLeaveApprovedNotification(leave: any) {
    try {
      const approverName = leave.approver
        ? `${leave.approver.firstName} ${leave.approver.lastName}`
        : 'Manager';

      const notification = await this.notificationsService.create({
        type: NotificationType.LEAVE_APPROVED,
        recipientId: leave.employeeId,
        senderId: leave.approvedBy,
        title: 'Leave Request Approved',
        message: `Your ${leave.leaveType} leave request has been approved by ${approverName}`,
        metadata: {
          leaveId: leave.id,
          leaveType: leave.leaveType,
          startDate: leave.startDate.toISOString(),
          endDate: leave.endDate.toISOString(),
          days: leave.days,
        },
      });

      // Send real-time notification
      this.notificationsGateway.sendNotificationToUser(leave.employeeId, notification);

      this.logger.log(`Approval notification sent for leave ${leave.id}`);
    } catch (error) {
      this.logger.error(`Failed to send leave approved notification: ${error.message}`);
    }
  }

  /**
   * Send notification when leave is rejected
   */
  private async sendLeaveRejectedNotification(leave: any) {
    try {
      const approverName = leave.approver
        ? `${leave.approver.firstName} ${leave.approver.lastName}`
        : 'Manager';

      const notification = await this.notificationsService.create({
        type: NotificationType.LEAVE_REJECTED,
        recipientId: leave.employeeId,
        senderId: leave.approvedBy,
        title: 'Leave Request Rejected',
        message: `Your ${leave.leaveType} leave request has been rejected by ${approverName}`,
        metadata: {
          leaveId: leave.id,
          leaveType: leave.leaveType,
          startDate: leave.startDate.toISOString(),
          endDate: leave.endDate.toISOString(),
          days: leave.days,
          rejectionReason: leave.rejectionReason,
        },
      });

      // Send real-time notification
      this.notificationsGateway.sendNotificationToUser(leave.employeeId, notification);

      this.logger.log(`Rejection notification sent for leave ${leave.id}`);
    } catch (error) {
      this.logger.error(`Failed to send leave rejected notification: ${error.message}`);
    }
  }
}
