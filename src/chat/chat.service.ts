import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ChatQuestionLog,
  ChatQuestionLogDocument,
} from './chat-question-log.schema';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatStartersResponseDto,
} from './chat.dto';
import { FaqService } from './faq.service';
import { KnowledgeService } from './knowledge.service';
import { OpenAiService } from './openai.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly faqService: FaqService,
    private readonly knowledgeService: KnowledgeService,
    private readonly openAiService: OpenAiService,
    @InjectModel(ChatQuestionLog.name)
    private readonly questionLogModel: Model<ChatQuestionLogDocument>,
  ) {}

  async getStarters(): Promise<ChatStartersResponseDto> {
    const starters = await this.faqService.getStarterQuestions(4);

    const fallbackStarters = [
      '¿Quién sos y a qué te dedicás?',
      '¿Qué tecnologías usás?',
      '¿Qué proyecto destacás de tu portfolio?',
      '¿Cuál fue tu experiencia más reciente?',
    ];

    const combined = [...starters];
    for (const question of fallbackStarters) {
      if (combined.length >= 4) {
        break;
      }
      if (!combined.includes(question)) {
        combined.push(question);
      }
    }

    return { suggestedQuestions: combined.slice(0, 4) };
  }

  async reply(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const faqMatch = await this.faqService.findBestMatch(dto.message);

    if (faqMatch?._id) {
      const faqId = faqMatch._id.toHexString();
      await this.faqService.incrementUsage(faqId);

      const faqSuggestions = this.faqService.buildFollowUpSuggestions(faqMatch);
      const aiRephrasing = await this.openAiService.generateChatResponse({
        userMessage: dto.message,
        contextItems: [
          {
            sourceType: 'faq',
            sourceId: faqId,
            title: faqMatch.question,
            text: faqMatch.answer,
            tags: faqMatch.tags ?? [],
          },
        ],
        suggestedSeedQuestions: faqSuggestions,
      });

      const response: ChatResponseDto = {
        answer: aiRephrasing?.answer || faqMatch.answer,
        suggestedQuestions: this.mergeSuggestions(
          aiRephrasing?.suggestedQuestions ?? [],
          faqSuggestions,
        ),
        source: 'faq',
      };

      await this.logQuestion(dto, response.source, faqId);
      return response;
    }

    const contextItems = await this.knowledgeService.getRelevantContext(
      dto.message,
    );
    const aiResponse = await this.openAiService.generateChatResponse({
      userMessage: dto.message,
      contextItems,
      suggestedSeedQuestions: [
        '¿Qué tecnologías usaste en ese proyecto?',
        '¿Cuál fue el mayor desafío técnico?',
        '¿Qué rol tuviste en ese proyecto?',
        '¿Qué otros proyectos similares tenés?',
      ],
    });

    if (aiResponse && aiResponse.answer) {
      const response: ChatResponseDto = {
        answer: aiResponse.answer,
        suggestedQuestions: this.mergeSuggestions(
          aiResponse.suggestedQuestions,
          [
            '¿Qué proyecto destacás de tu portfolio?',
            '¿Qué tecnologías usás actualmente?',
            '¿Cuál fue tu experiencia más reciente?',
            '¿En qué tipo de proyectos te especializás?',
          ],
        ),
        source: 'ai',
      };

      await this.logQuestion(dto, response.source);
      return response;
    }

    const fallbackResponse: ChatResponseDto = {
      answer:
        'No tengo esa información disponible en el portfolio por ahora. Si querés, podés preguntarme sobre proyectos, tecnologías o experiencia.',
      suggestedQuestions: [
        '¿Qué tecnologías usás?',
        '¿Qué proyecto destacás de tu portfolio?',
        '¿Cuál fue tu experiencia más reciente?',
        '¿Cómo puedo contactarte?',
      ],
      source: 'fallback',
    };

    await this.logQuestion(dto, fallbackResponse.source);
    return fallbackResponse;
  }

  private mergeSuggestions(
    primary: readonly string[],
    fallback: readonly string[],
  ): string[] {
    const seen = new Set<string>();
    const merged: string[] = [];

    for (const suggestion of [...primary, ...fallback]) {
      const clean = suggestion.trim();
      if (!clean) {
        continue;
      }

      const key = clean.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push(clean);

      if (merged.length >= 4) {
        break;
      }
    }

    return merged;
  }

  private async logQuestion(
    dto: ChatRequestDto,
    source: ChatResponseDto['source'],
    matchedFaqId?: string,
  ): Promise<void> {
    await this.questionLogModel.create({
      question: dto.message,
      sessionId: dto.sessionId,
      source,
      matchedFaqId,
    });
  }
}
