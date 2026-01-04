import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SendMessageDto } from './dto';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { LLMService } from './services/llm.service';
import { IntentDetectionService } from './services/intent-detection.service';
import { ActionHandlerRegistry } from './handlers/action-handler.registry';
import { LeaveApplicationHandler } from './handlers/leave-application.handler';
import { LeaveBalanceHandler } from './handlers/leave-balance.handler';
import { LeaveStatusHandler } from './handlers/leave-status.handler';
import { LeaveCancelHandler } from './handlers/leave-cancel.handler';
import { LeavePolicyHandler } from './handlers/leave-policy.handler';
import { GreetingHandler } from './handlers/greeting.handler';
import { GeneralQueryHandler } from './handlers/general-query.handler';

export interface ChatResponse {
  id: string;
  message: string;
  conversationId: string;
  timestamp: string;
}

@Injectable()
export class ChatbotService implements OnModuleInit {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    private readonly llmService: LLMService,
    private readonly intentDetectionService: IntentDetectionService,
    private readonly actionHandlerRegistry: ActionHandlerRegistry,
    private readonly leaveApplicationHandler: LeaveApplicationHandler,
    private readonly leaveBalanceHandler: LeaveBalanceHandler,
    private readonly leaveStatusHandler: LeaveStatusHandler,
    private readonly leaveCancelHandler: LeaveCancelHandler,
    private readonly leavePolicyHandler: LeavePolicyHandler,
    private readonly greetingHandler: GreetingHandler,
    private readonly generalQueryHandler: GeneralQueryHandler,
  ) {}

  /**
   * Register all action handlers on module initialization
   */
  onModuleInit() {
    this.logger.log('Initializing ChatbotService and registering action handlers');

    this.actionHandlerRegistry.registerHandler(this.leaveApplicationHandler);
    this.actionHandlerRegistry.registerHandler(this.leaveBalanceHandler);
    this.actionHandlerRegistry.registerHandler(this.leaveStatusHandler);
    this.actionHandlerRegistry.registerHandler(this.leaveCancelHandler);
    this.actionHandlerRegistry.registerHandler(this.leavePolicyHandler);
    this.actionHandlerRegistry.registerHandler(this.greetingHandler);
    this.actionHandlerRegistry.registerHandler(this.generalQueryHandler);

    this.logger.log(`Registered ${this.actionHandlerRegistry.getRegisteredIntents().length} action handlers`);
  }

  /**
   * Process user message and generate bot response
   */
  async sendMessage(
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<ChatResponse> {
    const { message, conversationId } = sendMessageDto;

    this.logger.log(`Processing message from user ${userId}: ${message}`);

    // Find or create conversation
    let conversation: ConversationDocument;

    if (conversationId) {
      conversation = await this.conversationModel.findById(conversationId);
      if (!conversation || conversation.userId !== userId) {
        throw new NotFoundException('Conversation not found');
      }
    } else {
      // Create new conversation with a title based on first message
      const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
      conversation = new this.conversationModel({
        userId,
        title,
        messages: [],
        lastMessageAt: new Date(),
      });
    }

    // Add user message
    const userMessage = {
      content: message,
      role: 'user',
      timestamp: new Date(),
    };
    conversation.messages.push(userMessage);

    // Generate bot response using LLM pipeline with conversation history
    const botResponse = await this.generateResponse(
      message,
      userId,
      conversation.messages,
    );

    // Add bot message
    const botMessage = {
      content: botResponse,
      role: 'bot',
      timestamp: new Date(),
    };
    conversation.messages.push(botMessage);
    conversation.lastMessageAt = new Date();

    // Save conversation
    await conversation.save();

    return {
      id: conversation._id.toString(),
      message: botResponse,
      conversationId: conversation._id.toString(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate intelligent response using LLM pipeline
   */
  private async generateResponse(
    userMessage: string,
    userId: string,
    conversationHistory?: any[],
  ): Promise<string> {
    try {
      this.logger.log(`[STEP 1] Generating response for user ${userId}`);

      // Step 1: Detect intent using LLM
      const recentMessages = conversationHistory
        ?.slice(-5) // Last 5 messages for context
        .map((msg) => `${msg.role}: ${msg.content}`);

      this.logger.log(`[STEP 2] Detecting intent...`);
      const intentResult = await this.intentDetectionService.detectIntent(
        userMessage,
        recentMessages,
      );

      this.logger.log(`[STEP 3] Detected intent: ${intentResult.intent} (confidence: ${intentResult.confidence})`);
      this.logger.debug(`Intent entities: ${JSON.stringify(intentResult.entities)}`);

      // Step 2: Execute action based on intent
      const actionContext = {
        userId,
        userMessage,
        intentResult,
        conversationHistory,
      };

      this.logger.log(`[STEP 4] Executing action handler for intent: ${intentResult.intent}`);
      const actionResult = await this.actionHandlerRegistry.executeAction(actionContext);

      this.logger.log(`[STEP 5] Action executed. Success: ${actionResult.success}`);

      // Step 3: Return the response
      return actionResult.message;
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`, error.stack);
      return 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.';
    }
  }

  // ============================================
  // Legacy Helper Methods (kept for reference, can be removed later)
  // ============================================

  /**
   * Handle department-related queries
   */
  private async handleDepartmentQuery(): Promise<string> {
    try {
      const departments = await this.prisma.department.findMany({
        where: { isActive: true },
        select: {
          name: true,
          _count: {
            select: { employees: true },
          },
        },
        take: 5,
      });

      if (departments.length === 0) {
        return 'No departments found in the system.';
      }

      const deptList = departments
        .map((dept) => `• ${dept.name} (${dept._count.employees} employees)`)
        .join('\n');

      return `Here are the main departments:\n${deptList}\n\nYou can view more details in the Employees section.`;
    } catch (error) {
      this.logger.error(`Error in handleDepartmentQuery: ${error.message}`);
      return 'You can find department information in the application.';
    }
  }

  /**
   * Get help message
   */
  private getHelpMessage(): string {
    return `I'm your HRMS Assistant! I can help you with:\n\n📋 **Leave Management**\n• Check leave balance\n• Apply for leave\n• View leave history\n\n👥 **Employee Information**\n• View employee details\n• Check team information\n• Department distribution\n\n👤 **Your Profile**\n• View your details\n• Update information\n\n📊 **Dashboard & Reports**\n• Quick insights\n• Analytics\n\nJust ask me anything about these topics!`;
  }

  /**
   * Start a new conversation (returns null, actual conversation created on first message)
   */
  async startConversation(userId: string): Promise<{ conversationId: string | null }> {
    this.logger.log(`User ${userId} ready to start new conversation`);
    // Return null - conversation will be created when first message is sent
    return { conversationId: null };
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    this.logger.log(`Fetching conversations for user ${userId}`);
    return this.conversationModel
      .find({ userId, isActive: true })
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversationById(
    userId: string,
    conversationId: string,
  ): Promise<ConversationDocument> {
    this.logger.log(`Fetching conversation ${conversationId} for user ${userId}`);
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    this.logger.log(`Deleting conversation ${conversationId} for user ${userId}`);
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    // Soft delete
    conversation.isActive = false;
    await conversation.save();
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(
    userId: string,
    conversationId: string,
    title: string,
  ): Promise<ConversationDocument> {
    this.logger.log(`Updating title for conversation ${conversationId}`);
    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.title = title;
    return conversation.save();
  }

  /**
   * Check health of chatbot service and Ollama connection
   */
  async checkHealth(): Promise<{
    status: string;
    ollamaAvailable: boolean;
    message: string;
    timestamp: string;
  }> {
    try {
      // Try to check if Ollama is available
      const isAvailable = await this.llmService.checkHealth();

      return {
        status: isAvailable ? 'ok' : 'degraded',
        ollamaAvailable: isAvailable,
        message: isAvailable
          ? 'Chatbot service is running and Ollama is available'
          : 'Chatbot service is running but Ollama is not available',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        status: 'degraded',
        ollamaAvailable: false,
        message: 'Chatbot service is running but Ollama is not available',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

