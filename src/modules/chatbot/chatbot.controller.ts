import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Delete,
  Patch,
  Param,
  Logger,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { LLMService } from './services/llm.service';
import { SendMessageDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly llmService: LLMService,
  ) {}

  /**
   * Check chatbot health (Ollama availability)
   * GET /api/chatbot/health
   */
  @Public()
  @Get('health')
  async checkHealth() {
    const isHealthy = await this.llmService.checkHealth();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      ollamaAvailable: isHealthy,
      message: isHealthy
        ? 'Ollama is running and ready'
        : 'Ollama is not available - chatbot features will be limited',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send a message to the chatbot
   * POST /api/chatbot/message
   */
  @Post('message')
  async sendMessage(
    @CurrentUser() user: CurrentUserData,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    this.logger.log(
      `User ${user.id} sent message: ${sendMessageDto.message}`,
    );
    return this.chatbotService.sendMessage(user.id, sendMessageDto);
  }

  /**
   * Start a new conversation
   * POST /api/chatbot/conversation
   */
  @Post('conversation')
  async startConversation(@CurrentUser() user: CurrentUserData) {
    this.logger.log(`User ${user.id} starting new conversation`);
    return this.chatbotService.startConversation(user.id);
  }

  /**
   * Get all conversations for current user
   * GET /api/chatbot/conversations
   */
  @Get('conversations')
  async getUserConversations(@CurrentUser() user: CurrentUserData) {
    this.logger.log(`Fetching conversations for user ${user.id}`);
    return this.chatbotService.getUserConversations(user.id);
  }

  /**
   * Get a specific conversation by ID
   * GET /api/chatbot/conversations/:id
   */
  @Get('conversations/:id')
  async getConversationById(
    @CurrentUser() user: CurrentUserData,
    @Param('id') conversationId: string,
  ) {
    this.logger.log(`Fetching conversation ${conversationId} for user ${user.id}`);
    return this.chatbotService.getConversationById(user.id, conversationId);
  }

  /**
   * Delete a conversation
   * DELETE /api/chatbot/conversations/:id
   */
  @Delete('conversations/:id')
  async deleteConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') conversationId: string,
  ) {
    this.logger.log(`Deleting conversation ${conversationId} for user ${user.id}`);
    await this.chatbotService.deleteConversation(user.id, conversationId);
    return { message: 'Conversation deleted successfully' };
  }

  /**
   * Update conversation title
   * PATCH /api/chatbot/conversations/:id
   */
  @Patch('conversations/:id')
  async updateConversationTitle(
    @CurrentUser() user: CurrentUserData,
    @Param('id') conversationId: string,
    @Body('title') title: string,
  ) {
    this.logger.log(`Updating title for conversation ${conversationId}`);
    return this.chatbotService.updateConversationTitle(user.id, conversationId, title);
  }


}

