import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { FaqService } from './faq.service';
import { KnowledgeService } from './knowledge.service';
import { OpenAiService } from './openai.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, FaqService, KnowledgeService, OpenAiService],
})
export class ChatModule {}
