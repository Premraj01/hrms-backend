import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { LeavesModule } from '../leaves/leaves.module';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';

// Services
import { LLMService } from './services/llm.service';
import { IntentDetectionService } from './services/intent-detection.service';

// Handlers
import { ActionHandlerRegistry } from './handlers/action-handler.registry';
import { LeaveApplicationHandler } from './handlers/leave-application.handler';
import { LeaveBalanceHandler } from './handlers/leave-balance.handler';
import { LeaveStatusHandler } from './handlers/leave-status.handler';
import { LeaveCancelHandler } from './handlers/leave-cancel.handler';
import { LeavePolicyHandler } from './handlers/leave-policy.handler';
import { GreetingHandler } from './handlers/greeting.handler';
import { GeneralQueryHandler } from './handlers/general-query.handler';

@Module({
  imports: [
    PrismaModule,
    LeavesModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    LLMService,
    IntentDetectionService,
    ActionHandlerRegistry,
    LeaveApplicationHandler,
    LeaveBalanceHandler,
    LeaveStatusHandler,
    LeaveCancelHandler,
    LeavePolicyHandler,
    GreetingHandler,
    GeneralQueryHandler,
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}

