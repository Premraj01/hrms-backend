import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { LeavesService } from '../../leaves/leaves.service';
import { IActionHandler, ActionContext, ActionResult } from './action-handler.interface';
import { Intent } from '../services/intent-detection.service';
import { LLMService } from '../services/llm.service';

@Injectable()
export class LeaveCancelHandler implements IActionHandler {
  readonly supportedIntent = Intent.LEAVE_CANCEL;
  private readonly logger = new Logger(LeaveCancelHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leavesService: LeavesService,
    private readonly llmService: LLMService,
  ) {}

  canExecute(context: ActionContext): boolean {
    return context.intentResult.intent === this.supportedIntent;
  }

  async execute(context: ActionContext): Promise<ActionResult> {
    try {
      const { userId, intentResult, userMessage } = context;
      const { entities } = intentResult;

      this.logger.log(`Processing leave cancellation for user: ${userId}`);

      // Get pending leaves
      const pendingLeaves = await this.prisma.leave.findMany({
        where: {
          employeeId: userId,
          status: 'pending',
        },
        orderBy: {
          startDate: 'asc',
        },
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          days: true,
        },
      });



      if (pendingLeaves.length === 0) {
        return {
          success: false,
          message: "You don't have any pending leave requests to cancel.",
        };
      }

      // If date is mentioned, try to find the specific leave
      let leaveToCancel = null;

      if (entities.date) {
        // Parse the date using LLM
        const dateInfo = await this.parseDate(entities.date, userMessage);
        this.logger.log(`Parsed date: ${dateInfo.date} from entities.date: ${entities.date}`);

        if (dateInfo.date) {
          // Find leave matching this date (check if the date falls within the leave period)
          leaveToCancel = pendingLeaves.find((leave) => {
            const targetDate = new Date(dateInfo.date);
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);

            // Normalize dates to midnight UTC for comparison
            targetDate.setUTCHours(0, 0, 0, 0);
            startDate.setUTCHours(0, 0, 0, 0);
            endDate.setUTCHours(0, 0, 0, 0);

            // Check if target date falls within the leave period (inclusive)
            return targetDate >= startDate && targetDate <= endDate;
          });

          this.logger.log(`Parsed date ${dateInfo.date}, found matching leave: ${leaveToCancel ? leaveToCancel.id : 'none'}`);
        }
      }

      // If only one pending leave, cancel it
      if (!leaveToCancel && pendingLeaves.length === 1) {
        leaveToCancel = pendingLeaves[0];
      }

      // If multiple pending leaves and no specific date, ask for clarification
      if (!leaveToCancel && pendingLeaves.length > 1) {
        let response = `You have ${pendingLeaves.length} pending leave requests:\n\n`;
        pendingLeaves.forEach((leave, index) => {
          const startDate = new Date(leave.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          const endDate = new Date(leave.endDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
          response += `${index + 1}. ${leave.leaveType} - ${dateRange} (${leave.days} day${leave.days > 1 ? 's' : ''})\n`;
        });
        response += `\nPlease specify which leave you want to cancel by mentioning the date (e.g., "Cancel my leave for ${new Date(pendingLeaves[0].startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}")`;

        return {
          success: false,
          message: response,
          data: pendingLeaves,
        };
      }

      // Cancel the leave
      if (leaveToCancel) {
        await this.leavesService.withdrawMyLeave(leaveToCancel.id, userId);

        const startDate = new Date(leaveToCancel.startDate).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        const endDate = new Date(leaveToCancel.endDate).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        const dateRange = startDate === endDate ? startDate : `${startDate} to ${endDate}`;

        return {
          success: true,
          message: `✅ Your ${leaveToCancel.leaveType} leave request for ${dateRange} has been cancelled successfully!`,
          data: leaveToCancel,
        };
      }

      return {
        success: false,
        message: "I couldn't find a matching leave request to cancel. Please check your pending leaves.",
      };
    } catch (error) {
      this.logger.error(`Error cancelling leave: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'I encountered an error while cancelling your leave. Please try again or use the Leave section.',
      };
    }
  }

  private async parseDate(dateStr: string, userMessage: string): Promise<{ date: string | null }> {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1; // 0-indexed

      const systemPrompt = `You are a date parser. Convert relative or natural language dates to absolute dates in YYYY-MM-DD format.
Today's date is ${today.toISOString().split('T')[0]} (${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}).
Current year is ${currentYear}.
Current month is ${currentMonth}.

Important rules:
- If only day and month are mentioned (e.g., "28th Jan", "Jan 28", "Dec 29"):
  * If the month is AFTER the current month (${currentMonth}), use the current year (${currentYear})
  * If the month is BEFORE the current month (${currentMonth}), use next year (${currentYear + 1})
  * If the month is the SAME as current month, compare the day with today's date
- Examples:
  * Today is Dec 29, 2025 (month 12)
  * "Jan 28" → 2026-01-28 (January is month 1, which is before December, so next year)
  * "Dec 25" → 2025-12-25 (December is same month, day 25 is before day 29, so this year)
  * "Dec 30" → 2025-12-30 (December is same month, day 30 is after day 29, so this year)
- "tomorrow" = ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}
- "today" = ${today.toISOString().split('T')[0]}
- "yesterday" = ${new Date(today.getTime() - 86400000).toISOString().split('T')[0]}

Respond with ONLY valid JSON using double quotes: { "date": "YYYY-MM-DD" }
No explanations, no markdown, just the JSON object.`;

      const userPrompt = `User message: "${userMessage}"
Extracted date mention: "${dateStr}"

Convert to YYYY-MM-DD format following the rules above.`;

      const result = await this.llmService.generateJSON<{ date: string }>(userPrompt, systemPrompt);
      this.logger.log(`LLM parsed date result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error parsing date: ${error.message}`);
      return { date: null };
    }
  }
}

