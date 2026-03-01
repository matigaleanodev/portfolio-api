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
  private readonly outOfScopeResponse: ChatResponseDto = {
    answer:
      'Solo puedo ayudar con preguntas sobre el portfolio, proyectos y experiencia de Matias Galeano. Podés consultarme por su stack, Foodly Notes, Modo Playa o su arquitectura backend con NestJS.',
    suggestedQuestions: [
      '¿Qué tecnologías usás actualmente?',
      '¿Qué proyecto destacás de tu portfolio?',
      '¿Cómo construiste el chatbot del portfolio?',
      '¿Cuál fue tu experiencia más reciente?',
    ],
    source: 'fallback',
  };

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
    if (this.isOutOfScopeQuestion(dto.message)) {
      await this.logQuestion(dto, this.outOfScopeResponse.source);
      return this.outOfScopeResponse;
    }

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

  private isOutOfScopeQuestion(message: string): boolean {
    const normalized = this.normalizeText(message);
    if (!normalized) {
      return false;
    }

    const hasPortfolioAnchor = this.containsAny(normalized, [
      'matias',
      'galeano',
      'portfolio',
      'portafolio',
      'proyecto',
      'proyectos',
      'experiencia',
      'trayectoria',
      'trabajo',
      'roles',
      'rol',
      'stack',
      'tecnologias',
      'tecnologia',
      'frontend',
      'backend',
      'api',
      'chatbot',
      'foodly',
      'modo playa',
      'contacto',
      'cv',
    ]);

    if (hasPortfolioAnchor) {
      return false;
    }

    const hasProfessionalTopic = this.containsAny(normalized, [
      'angular',
      'ionic',
      'nestjs',
      'nest',
      'typescript',
      'javascript',
      'node',
      'react',
      'vue',
      'mongodb',
      'sql',
      'aws',
      'docker',
      'arquitectura',
      'desarrollo',
      'app',
      'aplicacion',
      'codigo',
      'programacion',
      'framework',
      'libreria',
      'deploy',
      'performance',
      'testing',
      'ci',
      'cd',
    ]);

    const mathExpressionPattern = /^[\d\s+\-*/().=]+[?]?$/;
    if (mathExpressionPattern.test(normalized)) {
      return true;
    }

    if (
      this.containsAny(normalized, [
        'cuanto es',
        'how much is',
        'capital de',
        'history of',
        'historia de',
        'quien gano',
        'who won',
        'quien es',
        'who is',
        'define',
        'traduce',
      ]) &&
      !hasProfessionalTopic
    ) {
      return true;
    }

    const unrelatedBuildRequest =
      this.containsAny(normalized, [
        'implementa',
        'implementame',
        'crea',
        'desarrolla',
        'build',
        'implement',
        'write',
      ]) &&
      this.containsAny(normalized, [
        'en go',
        'in go',
        'en python',
        'in python',
        'en java',
        'in java',
      ]) &&
      !hasProfessionalTopic;

    if (unrelatedBuildRequest) {
      return true;
    }

    return false;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{L}\p{N}\s+\-*/().=?]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private containsAny(text: string, terms: readonly string[]): boolean {
    return terms.some((term) => text.includes(term));
  }
}
