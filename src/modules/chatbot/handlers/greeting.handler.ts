import { Injectable, Logger } from '@nestjs/common';
import { IActionHandler, ActionContext, ActionResult } from './action-handler.interface';
import { Intent } from '../services/intent-detection.service';
import { LLMService } from '../services/llm.service';

@Injectable()
export class GreetingHandler implements IActionHandler {
  private readonly logger = new Logger(GreetingHandler.name);
  readonly supportedIntent = Intent.GREETING;

  constructor(private readonly llmService: LLMService) {}

  canExecute(context: ActionContext): boolean {
    return true; // Greetings can always be handled
  }

  async execute(context: ActionContext): Promise<ActionResult> {
    try {
      const systemPrompt = `You are a friendly HRMS chatbot assistant. 
Respond to greetings warmly and professionally. 
Keep responses brief and helpful.
Mention that you can help with leave applications, checking leave status, and leave balances.`;

      const response = await this.llmService.generate(
        context.userMessage,
        systemPrompt,
      );

      return {
        success: true,
        message: response.content,
      };
    } catch (error) {
      this.logger.error(`Error generating greeting: ${error.message}`);
      
      // Fallback greeting
      return {
        success: true,
        message: "Hello! I'm your HRMS assistant. I can help you with leave applications, checking leave status, and viewing your leave balance. How can I assist you today?",
      };
    }
  }
}

