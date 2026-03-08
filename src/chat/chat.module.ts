import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatFaq, ChatFaqSchema } from './chat-faq.schema';
import {
  ChatQuestionLog,
  ChatQuestionLogSchema,
} from './chat-question-log.schema';
import { ChatService } from './chat.service';
import { FaqService } from './faq.service';
import { KnowledgeService } from './knowledge.service';
import { OpenAiService } from './openai.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatFaq.name, schema: ChatFaqSchema },
      { name: ChatQuestionLog.name, schema: ChatQuestionLogSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, FaqService, KnowledgeService, OpenAiService],
})
export class ChatModule {}
