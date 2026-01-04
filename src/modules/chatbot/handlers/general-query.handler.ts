import { Injectable, Logger } from '@nestjs/common';
import { IActionHandler, ActionContext, ActionResult } from './action-handler.interface';
import { Intent } from '../services/intent-detection.service';
import { LLMService } from '../services/llm.service';

@Injectable()
export class GeneralQueryHandler implements IActionHandler {
  private readonly logger = new Logger(GeneralQueryHandler.name);
  readonly supportedIntent = Intent.GENERAL_QUERY;

  constructor(private readonly llmService: LLMService) {}

  canExecute(context: ActionContext): boolean {
    return true;
  }

  async execute(context: ActionContext): Promise<ActionResult> {
    try {
      const systemPrompt = `You are an HRMS (Human Resource Management System) chatbot assistant.
You help employees with HR-related queries.

Available leave types:
- Annual Leave: Vacation days allocated yearly
- Sick Leave: For medical reasons
- Casual Leave: Short-term personal needs
- Personal Leave: Personal matters
- WFH (Work From Home): Remote work days
- Compensatory Leave: Compensation for overtime

You can help with:
- Applying for leave
- Checking leave status
- Viewing leave balance
- General HR policies

Provide helpful, accurate, and professional responses.
If you don't know something, be honest and suggest contacting HR directly.`;

      const response = await this.llmService.generate(
        context.userMessage,
        systemPrompt,
      );

      return {
        success: true,
        message: response.content,
      };
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      
      return {
        success: false,
        message: "I'm having trouble processing your question right now. Please try again or contact HR directly for assistance.",
      };
    }
  }
}

