import { Injectable, Logger } from '@nestjs/common';
import { IActionHandler, ActionContext, ActionResult } from './action-handler.interface';
import { Intent } from '../services/intent-detection.service';
import { LeavesService } from '../../leaves/leaves.service';
import { LLMService } from '../services/llm.service';

@Injectable()
export class LeaveApplicationHandler implements IActionHandler {
  private readonly logger = new Logger(LeaveApplicationHandler.name);
  readonly supportedIntent = Intent.LEAVE_APPLICATION;

  constructor(
    private readonly leavesService: LeavesService,
    private readonly llmService: LLMService,
  ) {}

  canExecute(context: ActionContext): boolean {
    const { entities } = context.intentResult;
    const { userMessage } = context;

    // We need at least a start date to proceed
    // If LLM didn't extract it, check if the message contains date-like patterns
    if (entities.startDate) {
      return true;
    }

    // Fallback: Check if message contains common date patterns
    const datePatterns = [
      /\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i,
      /tomorrow|today|next\s+(week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /\d{1,2}\/\d{1,2}(\/\d{2,4})?/,
      /\d{4}-\d{2}-\d{2}/,
    ];

    const hasDatePattern = datePatterns.some(pattern => pattern.test(userMessage));

    if (hasDatePattern) {
      this.logger.log(`Date pattern found in message but not extracted by LLM. Will attempt to parse.`);
      return true;
    }

    return false;
  }

  async execute(context: ActionContext): Promise<ActionResult> {
    try {
      const { userId, intentResult } = context;
      const { entities } = intentResult;

      this.logger.log(`Processing leave application for user: ${userId}`);
      this.logger.debug(`Entities: ${JSON.stringify(entities)}`);

      // Parse and normalize the dates using LLM
      const dateInfo = await this.parseDates(entities, context.userMessage);

      this.logger.debug(`Parsed dates: ${JSON.stringify(dateInfo)}`);

      if (!dateInfo.startDate) {
        return {
          success: false,
          message: "I couldn't determine the start date for your leave. Could you please specify when you want to take leave?",
        };
      }

      // Validate date format
      const startDate = new Date(dateInfo.startDate);
      if (isNaN(startDate.getTime())) {
        this.logger.error(`Invalid start date: ${dateInfo.startDate}`);
        return {
          success: false,
          message: "The date format seems incorrect. Please specify the date clearly (e.g., 'tomorrow', 'next Monday', or '2025-01-15').",
        };
      }

      // Default end date to start date if not provided (single day leave)
      const endDate = dateInfo.endDate ? new Date(dateInfo.endDate) : startDate;

      if (isNaN(endDate.getTime())) {
        this.logger.error(`Invalid end date: ${dateInfo.endDate}`);
        return {
          success: false,
          message: "The end date format seems incorrect. Please specify the date clearly.",
        };
      }

      // Calculate number of days
      const days = this.calculateDays(startDate, endDate);

      this.logger.debug(`Calculated days: ${days}`);

      // Determine leave type (default to Annual if not specified)
      const leaveType = this.normalizeLeaveType(entities.leaveType || 'Annual');

      // Extract reason
      const reason = entities.reason || 'Leave request via chatbot';

      // Format dates as YYYY-MM-DD strings
      const startDateStr = dateInfo.startDate; // Already in YYYY-MM-DD format from LLM
      const endDateStr = dateInfo.endDate || dateInfo.startDate;

      this.logger.log(`Creating leave: type=${leaveType}, start=${startDateStr}, end=${endDateStr}, days=${days}`);

      // Create the leave request
      const leave = await this.leavesService.create(userId, {
        leaveType,
        startDate: startDateStr,
        endDate: endDateStr,
        days,
        reason,
      });

      this.logger.log(`Leave request created successfully: ${leave.id}`);

      // Generate a friendly response
      const response = await this.generateResponse(leave, dateInfo);

      return {
        success: true,
        message: response,
        data: leave,
      };
    } catch (error) {
      this.logger.error(`Error creating leave request: ${error.message}`, error.stack);

      return {
        success: false,
        message: `I encountered an error while creating your leave request: ${error.message}. Please try again or contact HR.`,
      };
    }
  }

  private async parseDates(entities: any, userMessage: string): Promise<{ startDate: string; endDate?: string }> {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();

      const systemPrompt = `You are a date parser. Convert relative dates to absolute dates in YYYY-MM-DD format.
Today's date is ${today.toISOString().split('T')[0]} (${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}).
Current year is ${currentYear}.

IMPORTANT: Extract dates from the user message even if they are not in the extracted entities.

Examples:
- "tomorrow" -> ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}
- "next monday" -> date of next monday in YYYY-MM-DD format
- "15th January" or "Jan 15" or "15th Jan" -> ${currentYear}-01-15
- "3rd Jan" or "Jan 3" -> ${currentYear}-01-03
- "20th" (just day number) -> ${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}-20

Rules:
- If only month and day are given (e.g., "Jan 3"), assume current year ${currentYear}
- If only day is given (e.g., "15th"), assume current month and year
- If the date has already passed this year, assume next year

Respond with ONLY valid JSON using double quotes: { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }
If only one date is mentioned, set endDate to null.
No explanations, no markdown, just the JSON object.`;

      const userPrompt = `User message: "${userMessage}"
Previously extracted dates: startDate="${entities.startDate || 'not extracted'}", endDate="${entities.endDate || 'not extracted'}"

Parse ALL dates from the user message and convert to YYYY-MM-DD format.`;

      const result = await this.llmService.generateJSON<{ startDate: string; endDate?: string }>(
        userPrompt,
        systemPrompt,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error parsing dates: ${error.message}`);

      // Fallback: try to use the entities as-is
      return {
        startDate: entities.startDate,
        endDate: entities.endDate,
      };
    }
  }

  private calculateDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
    return diffDays;
  }

  private normalizeLeaveType(leaveType: string): string {
    const normalized = leaveType.toLowerCase();
    
    if (normalized.includes('sick')) return 'Sick';
    if (normalized.includes('casual')) return 'Casual';
    if (normalized.includes('annual') || normalized.includes('vacation')) return 'Annual';
    if (normalized.includes('personal')) return 'Personal';
    if (normalized.includes('wfh') || normalized.includes('work from home')) return 'WFH';
    if (normalized.includes('comp') || normalized.includes('compensatory')) return 'Compensatory';
    
    return 'Annual'; // Default
  }

  private async generateResponse(leave: any, dateInfo: any): Promise<string> {
    try {
      const startDate = new Date(dateInfo.startDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const endDate = dateInfo.endDate
        ? new Date(dateInfo.endDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : startDate;

      if (dateInfo.startDate === dateInfo.endDate || !dateInfo.endDate) {
        return `✅ Your ${leave.leaveType} leave request for ${startDate} has been submitted successfully!\n\n` +
               `📋 Leave ID: ${leave.id}\n` +
               `📅 Duration: ${leave.days} day(s)\n` +
               `📝 Status: Pending approval\n\n` +
               `Your manager will review your request soon. You'll be notified once it's approved.`;
      } else {
        return `✅ Your ${leave.leaveType} leave request has been submitted successfully!\n\n` +
               `📋 Leave ID: ${leave.id}\n` +
               `📅 From: ${startDate}\n` +
               `📅 To: ${endDate}\n` +
               `📅 Duration: ${leave.days} day(s)\n` +
               `📝 Status: Pending approval\n\n` +
               `Your manager will review your request soon. You'll be notified once it's approved.`;
      }
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      // Fallback simple response
      return `✅ Your ${leave.leaveType} leave request has been submitted successfully! (Leave ID: ${leave.id})\n\nStatus: Pending approval`;
    }
  }
}

