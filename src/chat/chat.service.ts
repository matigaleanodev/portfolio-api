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
    return { suggestedQuestions: [...CHAT_DEFAULT_STARTERS] };
  }

  async reply(dto: ChatRequestDto): Promise<ChatResponseDto> {
    if (this.isOutOfScopeQuestion(dto.message)) {
      const outOfScopeResponse = await this.buildSystemResponse(
        'out_of_scope',
        CHAT_DEFAULT_OUT_OF_SCOPE_ANSWER,
        CHAT_DEFAULT_OUT_OF_SCOPE_SUGGESTED_QUESTIONS,
      );
      await this.logQuestion(dto, outOfScopeResponse.source);
      return outOfScopeResponse;
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

      await this.logQuestion(dto, response.source);
      return response;
    }

    const fallbackResponse = await this.buildSystemResponse(
      'fallback',
      CHAT_DEFAULT_FALLBACK_ANSWER,
      CHAT_DEFAULT_FALLBACK_SUGGESTED_QUESTIONS,
    );

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

      if (merged.length >= 2) {
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
