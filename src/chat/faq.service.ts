import { Injectable } from '@nestjs/common';
import {
  CHAT_FAQ_ITEMS,
  ChatFaqEntry,
  ChatSystemEntryKey,
} from './content/chat-faq.data';

export interface ChatSystemEntry {
  answer: string;
  suggestedQuestions: string[];
}

@Injectable()
export class FaqService {
  async findBestMatch(question: string): Promise<ChatFaqEntry | null> {
    const normalizedQuestion = this.normalize(question);
    const keywordTokens = [...new Set(normalizedQuestion.split(' '))]
      .filter((token) => token.length >= 3)
      .slice(0, 6);

    let activeFaqs =
      keywordTokens.length > 0
        ? CHAT_FAQ_ITEMS.filter((faq) => {
            if (!faq.active) {
              return false;
            }

            const haystack = [faq.question, ...(faq.aliases ?? [])]
              .map((candidate) => this.normalize(candidate))
              .join(' ');

            return keywordTokens.some((token) => haystack.includes(token));
          })
        : [];

    if (activeFaqs.length === 0) {
      activeFaqs = CHAT_FAQ_ITEMS.filter((faq) => faq.active);
    }

    let bestMatch: ChatFaqEntry | null = null;
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

  async incrementUsage(_faqId: string): Promise<void> {
    return Promise.resolve();
  }

  async getSystemEntry(key: ChatSystemEntryKey): Promise<ChatSystemEntry | null> {
    const entry = CHAT_FAQ_ITEMS.find(
      (faq) => faq.active && (faq.tags ?? []).includes(`system:${key}`),
    );

    if (!entry) {
      return null;
    }

    return {
      answer: entry.answer ?? '',
      suggestedQuestions: (entry.suggestedQuestions ?? []).filter(Boolean),
    };
  }

  buildFollowUpSuggestions(faq: ChatFaqEntry, limit = 2): string[] {
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
