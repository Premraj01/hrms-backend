import { Injectable, Logger } from '@nestjs/common';
import { IActionHandler, ActionContext, ActionResult } from './action-handler.interface';
import { Intent } from '../services/intent-detection.service';

@Injectable()
export class ActionHandlerRegistry {
  private readonly logger = new Logger(ActionHandlerRegistry.name);
  private handlers: Map<Intent, IActionHandler> = new Map();

  /**
   * Register an action handler
   */
  registerHandler(handler: IActionHandler): void {
    this.logger.log(`Registering handler for intent: ${handler.supportedIntent}`);
    this.handlers.set(handler.supportedIntent, handler);
  }

  /**
   * Get handler for a specific intent
   */
  getHandler(intent: Intent): IActionHandler | undefined {
    return this.handlers.get(intent);
  }

  /**
   * Execute action for the given context
   */
  async executeAction(context: ActionContext): Promise<ActionResult> {
    const handler = this.getHandler(context.intentResult.intent);

    if (!handler) {
      this.logger.warn(`No handler found for intent: ${context.intentResult.intent}`);
      return {
        success: false,
        message: "I'm not sure how to help with that. Could you please rephrase your request?",
      };
    }

    if (!handler.canExecute(context)) {
      this.logger.warn(`Handler cannot execute for intent: ${context.intentResult.intent}`);
      return {
        success: false,
        message: "I don't have enough information to complete this request. Could you provide more details?",
      };
    }

    try {
      this.logger.log(`Executing handler for intent: ${context.intentResult.intent}`);
      return await handler.execute(context);
    } catch (error) {
      this.logger.error(`Error executing handler: ${error.message}`, error.stack);
      return {
        success: false,
        message: "I encountered an error while processing your request. Please try again.",
      };
    }
  }

  /**
   * Get all registered intents
   */
  getRegisteredIntents(): Intent[] {
    return Array.from(this.handlers.keys());
  }
}

