import { Injectable, Logger } from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  CHAT_BLOG_TOPIC_TERMS,
  CHAT_CLOUD_TOPIC_TERMS,
  CHAT_PROFILE_TOPIC_TERMS,
  CHAT_PROJECT_TOPIC_TERMS,
} from './chat-content.config';
import { CLOUD_KNOWLEDGE_ITEMS } from './knowledge/cloud.knowledge';
import { PROFILE_KNOWLEDGE_ITEMS } from './knowledge/profile.knowledge';
import { KnowledgeContextItem, KnowledgeLink } from './chat.types';

type EditorialKnowledgeArtifact = {
  generatedAt?: string;
  projects?: EditorialProjectEntry[];
  posts?: EditorialPostEntry[];
};

type EditorialProjectEntry = {
  slug: string;
  title: string;
  excerpt: string;
  stack?: string[];
  links?: KnowledgeLink[];
  highlights?: string[];
  searchText?: string;
};

type EditorialPostEntry = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags?: string[];
  canonicalUrl?: string;
  summary?: string;
  searchText?: string;
};

type KnowledgeCacheEntry = {
  filePath: string;
  mtimeMs: number;
  items: KnowledgeContextItem[];
};

const CURATED_KNOWLEDGE_ITEMS: readonly KnowledgeContextItem[] = [
  ...PROFILE_KNOWLEDGE_ITEMS,
  ...CLOUD_KNOWLEDGE_ITEMS,
];

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private editorialKnowledgeCache: KnowledgeCacheEntry | null = null;
  private missingEditorialPathLogged = false;
  private editorialLoadFailedLogged = false;

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
    const filePath = await this.resolveEditorialKnowledgePath();
    if (!filePath) {
      return [];
    }

    try {
      const stats = await fs.stat(filePath);
      if (
        this.editorialKnowledgeCache &&
        this.editorialKnowledgeCache.filePath === filePath &&
        this.editorialKnowledgeCache.mtimeMs === stats.mtimeMs
      ) {
        return this.editorialKnowledgeCache.items;
      }

      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as EditorialKnowledgeArtifact;
      const items = this.mapEditorialArtifactToKnowledgeItems(parsed);
      this.editorialKnowledgeCache = {
        filePath,
        mtimeMs: stats.mtimeMs,
        items,
      };
      this.editorialLoadFailedLogged = false;

      return items;
    } catch (error) {
      if (!this.editorialLoadFailedLogged) {
        this.logger.warn(
          `Failed to load editorial chat knowledge from "${filePath}": ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
        this.editorialLoadFailedLogged = true;
      }
      return [];
    }
  }

  private async resolveEditorialKnowledgePath(): Promise<string | null> {
    const configured = process.env.CHAT_EDITORIAL_KNOWLEDGE_PATH?.trim();
    const candidatePaths = configured
      ? [path.resolve(configured)]
      : [
          path.resolve(process.cwd(), '.generated', 'chat', 'knowledge.json'),
          path.resolve(
            process.cwd(),
            '..',
            'portfolio',
            '.generated',
            'chat',
            'knowledge.json',
          ),
        ];

    for (const candidatePath of candidatePaths) {
      try {
        await fs.access(candidatePath);
        return candidatePath;
      } catch {
        continue;
      }
    }

    if (!this.missingEditorialPathLogged) {
      this.logger.warn(
        'Editorial chat knowledge artifact not found. The chatbot will answer only with curated local knowledge.',
      );
      this.missingEditorialPathLogged = true;
    }

    return null;
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
