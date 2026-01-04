import { Intent, IntentDetectionResult } from '../services/intent-detection.service';

export interface ActionContext {
  userId: string;
  userMessage: string;
  intentResult: IntentDetectionResult;
  conversationHistory?: any[];
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
}

export interface IActionHandler {
  /**
   * The intent this handler supports
   */
  readonly supportedIntent: Intent;

  /**
   * Execute the action
   */
  execute(context: ActionContext): Promise<ActionResult>;

  /**
   * Validate if the handler can execute with the given context
   */
  canExecute(context: ActionContext): boolean;
}

