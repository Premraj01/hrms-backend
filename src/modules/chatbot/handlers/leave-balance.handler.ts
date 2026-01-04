import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { IActionHandler, ActionContext, ActionResult } from './action-handler.interface';
import { Intent } from '../services/intent-detection.service';

@Injectable()
export class LeaveBalanceHandler implements IActionHandler {
  readonly supportedIntent = Intent.LEAVE_BALANCE;
  private readonly logger = new Logger(LeaveBalanceHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  canExecute(context: ActionContext): boolean {
    return context.intentResult.intent === this.supportedIntent;
  }

  async execute(context: ActionContext): Promise<ActionResult> {
    try {
      const { userId } = context;

      this.logger.log(`Fetching leave balance for user: ${userId}`);

      // Get employee details
      const employee = await this.prisma.employee.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
        },
      });

      if (!employee) {
        return {
          success: false,
          message: 'I could not find your employee profile. Please contact HR.',
        };
      }

      // Get all leaves for the current year
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

      const leaves = await this.prisma.leave.findMany({
        where: {
          employeeId: userId,
          startDate: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        select: {
          leaveType: true,
          days: true,
          status: true,
        },
      });

      // Calculate leave balance by type
      const leaveStats = this.calculateLeaveStats(leaves);

      // Generate response
      const response = this.generateBalanceResponse(employee, leaveStats, currentYear);

      return {
        success: true,
        message: response,
        data: leaveStats,
      };
    } catch (error) {
      this.logger.error(`Error fetching leave balance: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'I encountered an error while fetching your leave balance. Please try again or check the Leave section.',
      };
    }
  }

  private calculateLeaveStats(leaves: any[]): any {
    const stats = {
      Annual: { total: 20, used: 0, pending: 0, available: 20 },
      Sick: { total: 10, used: 0, pending: 0, available: 10 },
      Casual: { total: 7, used: 0, pending: 0, available: 7 },
      Personal: { total: 5, used: 0, pending: 0, available: 5 },
      WFH: { total: 12, used: 0, pending: 0, available: 12 },
      Compensatory: { total: 0, used: 0, pending: 0, available: 0 },
    };

    leaves.forEach((leave) => {
      const type = leave.leaveType;
      if (stats[type]) {
        if (leave.status === 'approved') {
          stats[type].used += leave.days;
        } else if (leave.status === 'pending') {
          stats[type].pending += leave.days;
        }
      }
    });

    // Calculate available
    Object.keys(stats).forEach((type) => {
      stats[type].available = stats[type].total - stats[type].used - stats[type].pending;
    });

    return stats;
  }

  private generateBalanceResponse(employee: any, stats: any, year: number): string {
    let response = `📊 **Leave Balance for ${employee.firstName} ${employee.lastName}** (${year})\n\n`;

    const leaveTypes = ['Annual', 'Sick', 'Casual', 'Personal', 'WFH'];

    leaveTypes.forEach((type) => {
      const stat = stats[type];
      response += `**${type} Leave:**\n`;
      response += `  • Total: ${stat.total} days\n`;
      response += `  • Used: ${stat.used} days\n`;
      if (stat.pending > 0) {
        response += `  • Pending: ${stat.pending} days\n`;
      }
      response += `  • Available: ${stat.available} days\n\n`;
    });

    response += `💡 **Tip:** You can apply for leave by saying "Apply for leave tomorrow" or check your leave status by asking "What is my leave status?"`;

    return response;
  }
}

