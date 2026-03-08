import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { FaqService } from './faq.service';
import { KnowledgeService } from './knowledge.service';
import { OpenAiService } from './openai.service';
import { ChatKnowledgeRepository } from './chat-knowledge.repository';

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    FaqService,
    KnowledgeService,
    OpenAiService,
    ChatKnowledgeRepository,
  ],
})
export class ChatModule {}
