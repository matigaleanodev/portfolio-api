import { Injectable } from '@nestjs/common';
import {
  CHAT_BLOG_TOPIC_TERMS,
  CHAT_CLOUD_TOPIC_TERMS,
  CHAT_PROFILE_TOPIC_TERMS,
  CHAT_PROJECT_TOPIC_TERMS,
} from './chat-content.config';
import { CLOUD_KNOWLEDGE_ITEMS } from './knowledge/cloud.knowledge';
import { PROFILE_KNOWLEDGE_ITEMS } from './knowledge/profile.knowledge';
import { KnowledgeContextItem } from './chat.types';
import {
  ChatKnowledgeRepository,
  EditorialKnowledgeArtifact,
} from './chat-knowledge.repository';

const CURATED_KNOWLEDGE_ITEMS: readonly KnowledgeContextItem[] = [
  ...PROFILE_KNOWLEDGE_ITEMS,
  ...CLOUD_KNOWLEDGE_ITEMS,
];

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly chatKnowledgeRepository: ChatKnowledgeRepository,
  ) {}

  async getRelevantContext(question: string): Promise<KnowledgeContextItem[]> {
    const normalized = this.normalize(question);
    const editorialItems = await this.getEditorialKnowledgeItems();
    const scored = [...CURATED_KNOWLEDGE_ITEMS, ...editorialItems]
      .map((item) => ({
        item,
        score: this.scoreItem(normalized, item),
      }))
      .sort((left, right) => right.score - left.score);

    const relevant = scored.filter((entry) => entry.score > 0).slice(0, 4);

    if (relevant.length > 0) {
      return relevant.map((entry) => entry.item);
    }

    return scored.slice(0, 3).map((entry) => entry.item);
  }

  private async getEditorialKnowledgeItems(): Promise<KnowledgeContextItem[]> {
    const artifact = await this.chatKnowledgeRepository.getKnowledge();

    return this.mapEditorialArtifactToKnowledgeItems(artifact);
  }

  private mapEditorialArtifactToKnowledgeItems(
    artifact: EditorialKnowledgeArtifact,
  ): KnowledgeContextItem[] {
    const projectItems = (artifact.projects ?? []).map((project) => ({
      sourceType: 'project' as const,
      sourceId: project.slug,
      title: project.title,
      text: [project.excerpt, project.highlights?.join(' '), project.searchText]
        .filter(Boolean)
        .join(' '),
      tags: project.stack ?? [],
      links: project.links ?? [],
    }));

    const postItems = (artifact.posts ?? []).map((post) => ({
      sourceType: 'post' as const,
      sourceId: post.slug,
      title: post.title,
      text: [post.excerpt, post.summary, post.searchText]
        .filter(Boolean)
        .join(' '),
      tags: post.tags ?? [],
      links: post.canonicalUrl
        ? [{ label: 'Post del blog', url: post.canonicalUrl }]
        : [],
    }));

    return [...projectItems, ...postItems];
  }

  private scoreItem(question: string, item: KnowledgeContextItem): number {
    const tagText = (item.tags ?? []).join(' ');
    const linkText = (item.links ?? [])
      .map((link) => `${link.label} ${link.url}`)
      .join(' ');
    const sourceAffinity = this.getSourceAffinityScore(question, item);

    return (
      sourceAffinity * 4 +
      this.keywordScore(question, item.title) * 3 +
      this.keywordScore(question, item.text) * 2 +
      this.keywordScore(question, tagText) * 2 +
      this.keywordScore(question, linkText)
    );
  }

  private getSourceAffinityScore(
    question: string,
    item: KnowledgeContextItem,
  ): number {
    switch (item.sourceType) {
      case 'project':
        return this.containsAny(question, CHAT_PROJECT_TOPIC_TERMS) ? 2 : 0;
      case 'post':
        return this.containsAny(question, CHAT_BLOG_TOPIC_TERMS) ? 2 : 0;
      case 'cloud':
        return this.containsAny(question, CHAT_CLOUD_TOPIC_TERMS) ? 2 : 0;
      case 'profile':
        return this.containsAny(question, CHAT_PROFILE_TOPIC_TERMS) ? 2 : 0;
      default:
        return 0;
    }
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{L}\p{N}\s:/.-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private keywordScore(question: string, text: string): number {
    const normalizedText = this.normalize(text);
    const tokens = question
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);

    if (tokens.length === 0 || !normalizedText) {
      return 0;
    }

    return tokens.reduce(
      (score, token) => score + (normalizedText.includes(token) ? 1 : 0),
      0,
    );
  }

  private containsAny(text: string, terms: readonly string[]): boolean {
    return terms.some((term) => text.includes(term));
  }
}
