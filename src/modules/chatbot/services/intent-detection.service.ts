import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from './llm.service';

export enum Intent {
  LEAVE_APPLICATION = 'leave_application',
  LEAVE_STATUS = 'leave_status',
  LEAVE_BALANCE = 'leave_balance',
  LEAVE_CANCEL = 'leave_cancel',
  LEAVE_POLICY = 'leave_policy',
  GENERAL_QUERY = 'general_query',
  GREETING = 'greeting',
  UNKNOWN = 'unknown',
}

export interface IntentDetectionResult {
  intent: Intent;
  confidence: number;
  entities: Record<string, any>;
}

@Injectable()
export class IntentDetectionService {
  private readonly logger = new Logger(IntentDetectionService.name);

  constructor(private readonly llmService: LLMService) {}

  async detectIntent(userMessage: string, conversationHistory?: string[]): Promise<IntentDetectionResult> {
    try {
      this.logger.log(`Detecting intent for message: "${userMessage}"`);

      const systemPrompt = `You are an intent detection system for an HRMS (Human Resource Management System) chatbot.
Your job is to analyze user messages and determine their intent.

Available intents:
1. leave_application - User wants to apply for leave
   Examples: "I want to take leave tomorrow", "Apply for sick leave", "Request leave for next week"

2. leave_status - User wants to check status of their leave requests
   Examples: "What's the status of my leave?", "Is my leave approved?", "How many leaves are pending?", "Show my pending leaves", "Check leave request status"

3. leave_balance - User wants to check their available leave balance
   Examples: "How many leaves do I have left?", "Check my leave balance", "What's my remaining leave?", "How many days can I take off?"

4. leave_cancel - User wants to cancel/withdraw a leave request
   Examples: "Cancel my leave", "Withdraw my leave request", "I want to cancel my pending leave", "Cancel my leave for Jan 10"

5. leave_policy - User wants to know about leave policies and rules
   Examples: "What is sick leave policy?", "What types of leave are available?", "How many sick leaves can I take?", "What is the leave policy?"

6. greeting - User is greeting or saying goodbye
   Examples: "Hi", "Hello", "Thanks", "Bye", "Good morning"

7. general_query - User has a general question about HR (not specifically about leave policies)
   Examples: "How do I update my profile?", "Who is my manager?", "What are the office timings?"

8. unknown - Cannot determine intent

For leave_application intent, extract these entities:
- startDate: The start date in ANY format mentioned (e.g., "tomorrow", "next monday", "3rd Jan", "Jan 3", "January 3rd", "2025-01-15", "15th", "15/01/2025"). ALWAYS extract if ANY date is mentioned.
- endDate: The end date (relative or absolute, can be null for single day)
- leaveType: Type of leave (Annual, Sick, Casual, Personal, WFH, Compensatory) - infer if not explicitly stated
- reason: Reason for leave if mentioned (can be null)
- days: Number of days if mentioned (can be null)

IMPORTANT: For dates like "3rd Jan", "Jan 3", "15th", etc., extract them EXACTLY as written. Do NOT set to null.

For leave_status intent, extract these entities:
- status: The status filter if mentioned (pending, approved, rejected, or null for all)

For leave_cancel intent, extract these entities:
- leaveId: The leave ID if mentioned (can be null)
- date: The date of leave to cancel if mentioned (can be null)

For leave_policy intent, extract these entities:
- leaveType: The specific leave type being asked about (Annual, Sick, Casual, etc., or null for general policy)

CRITICAL: Respond with ONLY valid JSON using double quotes. No explanations, no markdown.

Example responses:
{"intent": "leave_application", "confidence": 0.95, "entities": {"startDate": "tomorrow", "endDate": null, "leaveType": "Annual", "reason": null, "days": null}}
{"intent": "leave_application", "confidence": 0.95, "entities": {"startDate": "3rd Jan", "endDate": null, "leaveType": "Casual", "reason": null, "days": null}}
{"intent": "leave_application", "confidence": 0.95, "entities": {"startDate": "Jan 15", "endDate": "Jan 20", "leaveType": "Annual", "reason": "vacation", "days": null}}
{"intent": "leave_status", "confidence": 0.9, "entities": {"status": "pending"}}
{"intent": "leave_balance", "confidence": 0.95, "entities": {}}
{"intent": "leave_cancel", "confidence": 0.9, "entities": {"leaveId": null, "date": "Jan 10"}}
{"intent": "leave_policy", "confidence": 0.9, "entities": {"leaveType": "Sick"}}`;

      const userPrompt = `User message: "${userMessage}"

${conversationHistory && conversationHistory.length > 0 ? `\nRecent conversation history:\n${conversationHistory.join('\n')}` : ''}

Analyze this message and respond with ONLY the JSON object.`;

      // Try up to 2 times (but skip retry on timeout errors)
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await this.llmService.generateJSON<IntentDetectionResult>(
            userPrompt,
            systemPrompt,
          );

          // Validate the result has required fields
          if (!result.intent || result.confidence === undefined) {
            throw new Error('Invalid intent detection result structure');
          }

          this.logger.log(`Detected intent: ${result.intent} (confidence: ${result.confidence})`);
          return result;
        } catch (error) {
          lastError = error;
          this.logger.warn(`Intent detection attempt ${attempt} failed: ${error.message}`);

          // Don't retry on timeout errors - fall back immediately
          if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
            this.logger.warn('Timeout detected, skipping retry and using fallback');
            break;
          }

          if (attempt < 2) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // All attempts failed
      this.logger.error(`Error detecting intent after retries: ${lastError?.message}`, lastError?.stack);

      // Fallback: Use simple keyword matching
      return this.fallbackIntentDetection(userMessage);
    } catch (error) {
      this.logger.error(`Unexpected error in intent detection: ${error.message}`, error.stack);
      return this.fallbackIntentDetection(userMessage);
    }
  }

  /**
   * Fallback intent detection using simple keyword matching
   */
  private fallbackIntentDetection(userMessage: string): IntentDetectionResult {
    const lowerMessage = userMessage.toLowerCase();

    // Check for greetings
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye)$/i.test(lowerMessage.trim())) {
      return {
        intent: Intent.GREETING,
        confidence: 0.8,
        entities: {},
      };
    }

    // Check for leave application
    if (/(apply|request|take|need).*(leave|off|vacation)/i.test(lowerMessage) ||
        /(tomorrow|today|next week|next month).*leave/i.test(lowerMessage)) {
      return {
        intent: Intent.LEAVE_APPLICATION,
        confidence: 0.6,
        entities: {
          startDate: this.extractSimpleDate(lowerMessage),
        },
      };
    }

    // Check for leave balance
    if (/(leave|vacation).*(balance|remaining|left|available)/i.test(lowerMessage) ||
        /how many.*(leave|days)/i.test(lowerMessage)) {
      return {
        intent: Intent.LEAVE_BALANCE,
        confidence: 0.7,
        entities: {},
      };
    }

    // Check for leave status
    if (/(leave|request).*(status|approved|pending|rejected)/i.test(lowerMessage) ||
        /how many.*(pending|approved)/i.test(lowerMessage)) {
      return {
        intent: Intent.LEAVE_STATUS,
        confidence: 0.7,
        entities: {
          status: lowerMessage.includes('pending') ? 'pending' : null,
        },
      };
    }

    // Check for leave cancellation
    if (/(cancel|withdraw|remove).*(leave|request)/i.test(lowerMessage)) {
      return {
        intent: Intent.LEAVE_CANCEL,
        confidence: 0.7,
        entities: {},
      };
    }

    // Check for leave policy
    if (/(leave|sick|annual|casual).*(policy|rule|allowed|can i take)/i.test(lowerMessage) ||
        /what (is|are).*(leave|sick|annual)/i.test(lowerMessage) ||
        /types of leave/i.test(lowerMessage)) {
      return {
        intent: Intent.LEAVE_POLICY,
        confidence: 0.7,
        entities: {},
      };
    }

    // Default to general query
    return {
      intent: Intent.GENERAL_QUERY,
      confidence: 0.5,
      entities: {},
    };
  }

  /**
   * Extract simple date references from text
   */
  private extractSimpleDate(text: string): string | null {
    if (/tomorrow/i.test(text)) return 'tomorrow';
    if (/today/i.test(text)) return 'today';
    if (/next week/i.test(text)) return 'next week';
    if (/next month/i.test(text)) return 'next month';
    if (/monday/i.test(text)) return 'next monday';
    if (/tuesday/i.test(text)) return 'next tuesday';
    if (/wednesday/i.test(text)) return 'next wednesday';
    if (/thursday/i.test(text)) return 'next thursday';
    if (/friday/i.test(text)) return 'next friday';
    return null;
  }

  /**
   * Validate if the detected intent has sufficient confidence
   */
  isConfident(result: IntentDetectionResult, threshold: number = 0.7): boolean {
    return result.confidence >= threshold;
  }
}

