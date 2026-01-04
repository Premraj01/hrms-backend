import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { IActionHandler, ActionContext, ActionResult } from './action-handler.interface';
import { Intent } from '../services/intent-detection.service';

@Injectable()
export class LeaveStatusHandler implements IActionHandler {
  readonly supportedIntent = Intent.LEAVE_STATUS;
  private readonly logger = new Logger(LeaveStatusHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  canExecute(context: ActionContext): boolean {
    return context.intentResult.intent === this.supportedIntent;
  }

  async execute(context: ActionContext): Promise<ActionResult> {
    try {
      const { userId, intentResult } = context;
      const { entities } = intentResult;

      this.logger.log(`Fetching leave status for user: ${userId}`);

      // Get status filter from entities
      const statusFilter = entities.status || null;

      // Build where clause
      const where: any = {
        employeeId: userId,
      };

      if (statusFilter) {
        where.status = statusFilter;
      }

      // Get leaves
      const leaves = await this.prisma.leave.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // Limit to last 10 leaves
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          days: true,
          reason: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
        },
      });

      if (leaves.length === 0) {
        const message = statusFilter
          ? `You don't have any ${statusFilter} leave requests.`
          : `You don't have any leave requests yet. You can apply for leave by saying "Apply for leave tomorrow".`;

        return {
          success: true,
          message,
          data: [],
        };
      }

      // Generate response
      const response = this.generateStatusResponse(leaves, statusFilter);

      return {
        success: true,
        message: response,
        data: leaves,
      };
    } catch (error) {
      this.logger.error(`Error fetching leave status: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'I encountered an error while fetching your leave status. Please try again or check the Leave section.',
      };
    }
  }

  private generateStatusResponse(leaves: any[], statusFilter: string | null): string {
    const title = statusFilter
      ? `📋 **Your ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Leave Requests**`
      : `📋 **Your Recent Leave Requests**`;

    let response = `${title}\n\n`;

    // Group by status
    const grouped = {
      pending: leaves.filter((l) => l.status === 'pending'),
      approved: leaves.filter((l) => l.status === 'approved'),
      rejected: leaves.filter((l) => l.status === 'rejected'),
    };

    // Show pending first
    if (grouped.pending.length > 0) {
      response += `⏳ **Pending (${grouped.pending.length})**\n`;
      grouped.pending.forEach((leave) => {
        response += this.formatLeave(leave);
      });
      response += '\n';
    }

    // Show approved
    if (grouped.approved.length > 0) {
      response += `✅ **Approved (${grouped.approved.length})**\n`;
      grouped.approved.forEach((leave) => {
        response += this.formatLeave(leave);
      });
      response += '\n';
    }

    // Show rejected
    if (grouped.rejected.length > 0) {
      response += `❌ **Rejected (${grouped.rejected.length})**\n`;
      grouped.rejected.forEach((leave) => {
        response += this.formatLeave(leave);
      });
      response += '\n';
    }

    response += `💡 **Tip:** You can cancel a pending leave by saying "Cancel my leave for [date]"`;

    return response;
  }

  private formatLeave(leave: any): string {
    const startDate = new Date(leave.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endDate = new Date(leave.endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const dateRange =
      startDate === endDate ? startDate : `${startDate} - ${endDate}`;

    let line = `  • ${leave.leaveType} - ${dateRange} (${leave.days} day${leave.days > 1 ? 's' : ''})`;

    if (leave.status === 'rejected' && leave.rejectionReason) {
      line += `\n    Reason: ${leave.rejectionReason}`;
    }

    return line + '\n';
  }
}

