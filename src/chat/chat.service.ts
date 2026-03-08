import { Injectable } from '@nestjs/common';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatStartersResponseDto,
} from './chat.dto';
import {
  CHAT_DEFAULT_AI_FALLBACK_SUGGESTIONS,
  CHAT_DEFAULT_AI_SEED_QUESTIONS,
  CHAT_DEFAULT_FALLBACK_ANSWER,
  CHAT_DEFAULT_FALLBACK_SUGGESTED_QUESTIONS,
  CHAT_DEFAULT_STARTERS,
  CHAT_DEFAULT_OUT_OF_SCOPE_ANSWER,
  CHAT_DEFAULT_OUT_OF_SCOPE_SUGGESTED_QUESTIONS,
  CHAT_GENERAL_KNOWLEDGE_TERMS,
  CHAT_GENERIC_BUILD_LANGUAGES,
  CHAT_GENERIC_BUILD_VERBS,
  CHAT_PORTFOLIO_ANCHOR_TERMS,
  CHAT_PROFESSIONAL_TOPIC_TERMS,
} from './chat-content.config';
import { KnowledgeContextItem } from './chat.types';
import { FaqService } from './faq.service';
import { KnowledgeService } from './knowledge.service';
import { OpenAiService } from './openai.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly faqService: FaqService,
    private readonly knowledgeService: KnowledgeService,
    private readonly openAiService: OpenAiService,
  ) {}

  getStarters(): Promise<ChatStartersResponseDto> {
    return Promise.resolve({
      suggestedQuestions: [...CHAT_DEFAULT_STARTERS],
    });
  }

  async reply(dto: ChatRequestDto): Promise<ChatResponseDto> {
    if (this.isOutOfScopeQuestion(dto.message)) {
      const outOfScopeResponse = await this.buildSystemResponse(
        'out_of_scope',
        CHAT_DEFAULT_OUT_OF_SCOPE_ANSWER,
        CHAT_DEFAULT_OUT_OF_SCOPE_SUGGESTED_QUESTIONS,
      );
      return outOfScopeResponse;
    }

    const faqMatch = await this.faqService.findBestMatch(dto.message);

    if (faqMatch?.id) {
      const faqId = faqMatch.id;
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

      return response;
    }

    const contextItems = await this.knowledgeService.getRelevantContext(
      dto.message,
    );
    const aiResponse = await this.openAiService.generateChatResponse({
      userMessage: dto.message,
      contextItems,
      suggestedSeedQuestions: await this.getSystemSuggestedQuestions(
        'ai_seed',
        CHAT_DEFAULT_AI_SEED_QUESTIONS,
      ),
    });

    if (aiResponse && aiResponse.answer) {
      const aiFallbackSuggestions = await this.getSystemSuggestedQuestions(
        'ai_fallback',
        CHAT_DEFAULT_AI_FALLBACK_SUGGESTIONS,
      );
      const response: ChatResponseDto = {
        answer: aiResponse.answer,
        suggestedQuestions: this.mergeSuggestions(
          aiResponse.suggestedQuestions,
          aiFallbackSuggestions,
        ),
        source: 'ai',
      };

      return response;
    }

    if (contextItems.length > 0) {
      const contextualFallback = this.buildContextualFallbackResponse(
        contextItems[0],
      );
      return contextualFallback;
    }

    const fallbackResponse = await this.buildSystemResponse(
      'fallback',
      CHAT_DEFAULT_FALLBACK_ANSWER,
      CHAT_DEFAULT_FALLBACK_SUGGESTED_QUESTIONS,
    );

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

      if (merged.length >= 2) {
        break;
      }
    }

    return merged;
  }

  private buildContextualFallbackResponse(
    item: KnowledgeContextItem,
  ): ChatResponseDto {
    const summary = this.buildShortContextSummary(item);

    return {
      answer: summary
        ? `Según el portfolio, ${summary}`
        : CHAT_DEFAULT_FALLBACK_ANSWER,
      suggestedQuestions: this.buildContextualSuggestions(item),
      source: 'fallback',
    };
  }

  private buildShortContextSummary(item: KnowledgeContextItem): string {
    const normalized = item.text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }

    if (normalized.length <= 220) {
      return normalized;
    }

    return `${normalized.slice(0, 217).trimEnd()}...`;
  }

  private buildContextualSuggestions(item: KnowledgeContextItem): string[] {
    const suggestionsBySource: Record<
      KnowledgeContextItem['sourceType'],
      readonly string[]
    > = {
      faq: [
        '¿Qué proyecto destacás de tu portfolio?',
        '¿Qué tecnologías usás actualmente?',
      ],
      profile: ['¿Cuál es tu experiencia laboral?', '¿Cómo puedo contactarte?'],
      project: [
        '¿Qué tecnologías usaste en ese proyecto?',
        '¿Qué links públicos tiene ese proyecto?',
      ],
      post: [
        '¿Qué otros posts del blog tenés?',
        '¿Qué tecnologías tratás en ese post?',
      ],
      cloud: [
        '¿Cómo está dividido el ecosistema portfolio?',
        '¿Qué resolviste con AWS Lambda y storage?',
      ],
    };

    return this.mergeSuggestions(
      suggestionsBySource[item.sourceType] ?? [],
      CHAT_DEFAULT_FALLBACK_SUGGESTED_QUESTIONS,
    );
  }

  private isOutOfScopeQuestion(message: string): boolean {
    const normalized = this.normalizeText(message);
    if (!normalized) {
      return false;
    }

    const hasPortfolioAnchor = this.containsAny(
      normalized,
      CHAT_PORTFOLIO_ANCHOR_TERMS,
    );

    if (hasPortfolioAnchor) {
      return false;
    }

    const hasProfessionalTopic = this.containsAny(
      normalized,
      CHAT_PROFESSIONAL_TOPIC_TERMS,
    );

    const mathExpressionPattern = /^[\d\s+\-*/().=]+[?]?$/;
    if (mathExpressionPattern.test(normalized)) {
      return true;
    }

    if (
      this.containsAny(normalized, CHAT_GENERAL_KNOWLEDGE_TERMS) &&
      !hasProfessionalTopic
    ) {
      return true;
    }

    const unrelatedBuildRequest =
      this.containsAny(normalized, CHAT_GENERIC_BUILD_VERBS) &&
      this.containsAny(normalized, CHAT_GENERIC_BUILD_LANGUAGES) &&
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

  private async buildSystemResponse(
    key: 'out_of_scope' | 'fallback',
    defaultAnswer: string,
    defaultSuggestedQuestions: readonly string[],
  ): Promise<ChatResponseDto> {
    const entry = await this.faqService.getSystemEntry(key);

    return {
      answer: entry?.answer?.trim() || defaultAnswer,
      suggestedQuestions:
        entry?.suggestedQuestions?.length && entry.suggestedQuestions.length > 0
          ? entry.suggestedQuestions.slice(0, 2)
          : [...defaultSuggestedQuestions].slice(0, 2),
      source: 'fallback',
    };
  }

  private async getSystemSuggestedQuestions(
    key: 'starter_fallback' | 'ai_seed' | 'ai_fallback',
    defaults: readonly string[],
  ): Promise<string[]> {
    const entry = await this.faqService.getSystemEntry(key);
    if (!entry || entry.suggestedQuestions.length === 0) {
      return [...defaults].slice(0, 2);
    }

    return entry.suggestedQuestions.slice(0, 2);
  }
}
