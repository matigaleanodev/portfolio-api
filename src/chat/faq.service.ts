import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatFaq, ChatFaqDocument } from './chat-faq.schema';

export type ChatSystemEntryKey =
  | 'out_of_scope'
  | 'fallback'
  | 'starter_fallback'
  | 'ai_seed'
  | 'ai_fallback';

export interface ChatSystemEntry {
  answer: string;
  suggestedQuestions: string[];
}

@Injectable()
export class FaqService {
  constructor(
    @InjectModel(ChatFaq.name)
    private readonly faqModel: Model<ChatFaqDocument>,
  ) {}

  async getStarterQuestions(limit = 4): Promise<string[]> {
    const fixed = await this.faqModel
      .find({ active: true, isFixedStarter: true })
      .sort({ starterPriority: 1, usageCount: -1 })
      .lean()
      .exec();

    const seen = new Set<string>();
    const starters: string[] = [];

    for (const faq of fixed) {
      const key = this.normalize(faq.question);
      if (!seen.has(key)) {
        seen.add(key);
        starters.push(faq.question);
      }
      if (starters.length >= limit) {
        return starters.slice(0, limit);
      }
    }

    const dynamicCandidates = await this.faqModel
      .find({
        active: true,
        isStarterCandidate: true,
        isFixedStarter: { $ne: true },
      })
      .sort({ usageCount: -1, starterPriority: 1 })
      .limit(20)
      .lean()
      .exec();

    const shuffled = this.shuffle([...dynamicCandidates]);

    for (const faq of shuffled) {
      const key = this.normalize(faq.question);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      starters.push(faq.question);

      if (starters.length >= limit) {
        break;
      }
    }

    return starters.slice(0, limit);
  }

  async findBestMatch(
    question: string,
  ): Promise<(ChatFaq & { _id: Types.ObjectId }) | null> {
    const normalizedQuestion = this.normalize(question);
    const keywordTokens = [...new Set(normalizedQuestion.split(' '))]
      .filter((token) => token.length >= 3)
      .slice(0, 6);

    let activeFaqs =
      keywordTokens.length > 0
        ? await this.faqModel
            .find({
              active: true,
              $or: [
                {
                  question: {
                    $regex: keywordTokens
                      .map((token) => this.escapeRegex(token))
                      .join('|'),
                    $options: 'i',
                  },
                },
                {
                  aliases: {
                    $regex: keywordTokens
                      .map((token) => this.escapeRegex(token))
                      .join('|'),
                    $options: 'i',
                  },
                },
              ],
            })
            .lean()
            .exec()
        : [];

    if (activeFaqs.length === 0) {
      activeFaqs = await this.faqModel.find({ active: true }).lean().exec();
    }

    let bestMatch: (ChatFaq & { _id: Types.ObjectId }) | null = null;
    let bestScore = 0;

    for (const faq of activeFaqs) {
      const candidates = [faq.question, ...(faq.aliases ?? [])];
      for (const candidate of candidates) {
        const score = this.score(normalizedQuestion, this.normalize(candidate));
        if (score > bestScore) {
          bestScore = score;
          bestMatch = faq;
        }
      }
    }

    return bestScore >= 0.75 ? bestMatch : null;
  }

  async incrementUsage(faqId: string): Promise<void> {
    await this.faqModel
      .updateOne({ _id: faqId }, { $inc: { usageCount: 1 } })
      .exec();
  }

  async getSystemEntry(key: ChatSystemEntryKey): Promise<ChatSystemEntry | null> {
    const entry = await this.faqModel
      .findOne({
        active: true,
        tags: { $in: [`system:${key}`] },
      })
      .lean()
      .exec();

    if (!entry) {
      return null;
    }

    return {
      answer: entry.answer ?? '',
      suggestedQuestions: (entry.suggestedQuestions ?? []).filter(Boolean),
    };
  }

  buildFollowUpSuggestions(faq: ChatFaq, limit = 4): string[] {
    const own = (faq.suggestedQuestions ?? []).filter(Boolean);
    if (own.length > 0) {
      return own.slice(0, limit);
    }

    const suggestionsByTag: Record<string, string[]> = {
      projects: [
        '¿Qué proyecto destacás de tu portfolio?',
        '¿Qué desafío técnico resolviste en ese proyecto?',
        '¿Qué tecnologías usaste en tus proyectos recientes?',
      ],
      experience: [
        '¿Cuál fue tu experiencia más reciente?',
        '¿Qué responsabilidades tuviste en ese rol?',
        '¿Qué aprendiste en ese trabajo?',
      ],
      skills: [
        '¿Qué tecnologías usás actualmente?',
        '¿Con qué stack te sentís más cómodo?',
        '¿Tenés experiencia con frontend también?',
      ],
    };

    const built = new Set<string>();
    for (const tag of faq.tags ?? []) {
      for (const suggestion of suggestionsByTag[tag] ?? []) {
        built.add(suggestion);
        if (built.size >= limit) {
          return [...built];
        }
      }
    }

    return [
      '¿Qué tecnologías usás actualmente?',
      '¿Qué proyecto destacás de tu portfolio?',
      '¿Cuál fue tu experiencia más reciente?',
      '¿En qué tipo de oportunidades te interesa trabajar?',
    ].slice(0, limit);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private score(input: string, candidate: string): number {
    if (!input || !candidate) {
      return 0;
    }

    if (input === candidate) {
      return 1;
    }

    if (input.includes(candidate) || candidate.includes(input)) {
      return 0.9;
    }

    const inputTokens = new Set(input.split(' '));
    const candidateTokens = new Set(candidate.split(' '));
    const intersection = [...inputTokens].filter((t) =>
      candidateTokens.has(t),
    ).length;
    const union = new Set([...inputTokens, ...candidateTokens]).size;

    return union === 0 ? 0 : intersection / union;
  }
}
