import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import {
  getChatKnowledgeR2Config,
  resolveExistingEditorialKnowledgePath,
  type ChatKnowledgeR2Config,
} from '../config/runtime.config';
import { KnowledgeLink } from './chat.types';

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

export type EditorialKnowledgeArtifact = {
  generatedAt?: string;
  projects?: EditorialProjectEntry[];
  posts?: EditorialPostEntry[];
};

type PublishedEditorialKnowledgeEnvelope = {
  version: number;
  generatedAt: string;
  source: {
    repository: string;
    artifactPath: string;
  };
  release?: {
    generatedAt: string;
    siteUrl: string;
  };
  contentHash: string;
  knowledge: EditorialKnowledgeArtifact;
};

type LocalKnowledgeCacheEntry = {
  filePath: string;
  mtimeMs: number;
  artifact: EditorialKnowledgeArtifact;
};

type RemoteKnowledgeCacheEntry = {
  artifact: EditorialKnowledgeArtifact;
  expiresAt: number;
};

type StringBody = {
  transformToString(): Promise<string>;
};

const REMOTE_KNOWLEDGE_TIMEOUT_MS = 5_000;

@Injectable()
export class ChatKnowledgeRepository {
  private readonly logger = new Logger(ChatKnowledgeRepository.name);
  private readonly r2Config: ChatKnowledgeR2Config | null;
  private readonly s3Client: S3Client | null;
  private remoteCache: RemoteKnowledgeCacheEntry | null = null;
  private remoteRequest: Promise<EditorialKnowledgeArtifact> | null = null;
  private localCache: LocalKnowledgeCacheEntry | null = null;
  private localArtifactMissingLogged = false;

  constructor(private readonly configService: ConfigService) {
    this.r2Config = getChatKnowledgeR2Config({
      R2_ENDPOINT: this.configService.get<string>('R2_ENDPOINT'),
      R2_REGION: this.configService.get<string>('R2_REGION'),
      R2_BUCKET: this.configService.get<string>('R2_BUCKET'),
      R2_ACCESS_KEY_ID: this.configService.get<string>('R2_ACCESS_KEY_ID'),
      R2_SECRET_ACCESS_KEY: this.configService.get<string>(
        'R2_SECRET_ACCESS_KEY',
      ),
      CHAT_KNOWLEDGE_OBJECT_KEY: this.configService.get<string>(
        'CHAT_KNOWLEDGE_OBJECT_KEY',
      ),
      CHAT_KNOWLEDGE_CACHE_TTL_MS: this.configService.get<string>(
        'CHAT_KNOWLEDGE_CACHE_TTL_MS',
      ),
    });

    this.s3Client = this.r2Config
      ? new S3Client({
          region: this.r2Config.region,
          endpoint: this.r2Config.endpoint,
          credentials: {
            accessKeyId: this.r2Config.accessKeyId,
            secretAccessKey: this.r2Config.secretAccessKey,
          },
          forcePathStyle: true,
        })
      : null;
  }

  async getKnowledge(): Promise<EditorialKnowledgeArtifact> {
    const cachedRemote = this.remoteCache;
    if (cachedRemote && cachedRemote.expiresAt > Date.now()) {
      return cachedRemote.artifact;
    }

    if (this.r2Config && this.s3Client) {
      try {
        return await this.loadRemoteKnowledge();
      } catch (error) {
        this.logger.warn(
          `Failed to load chat knowledge from R2 (${this.r2Config.bucket}/${this.r2Config.objectKey}): ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );

        if (cachedRemote) {
          this.logger.warn(
            'Using stale in-memory chat knowledge cache after R2 fetch failure.',
          );
          return cachedRemote.artifact;
        }
      }
    }

    const localArtifact = await this.loadLocalFallbackKnowledge();
    if (localArtifact) {
      return localArtifact;
    }

    throw new Error(
      'Chat knowledge is unavailable: R2 artifact could not be loaded and no valid local fallback exists.',
    );
  }

  private async loadRemoteKnowledge(): Promise<EditorialKnowledgeArtifact> {
    if (this.remoteRequest) {
      return this.remoteRequest;
    }

    if (!this.r2Config || !this.s3Client) {
      throw new Error('R2 chat knowledge is not configured');
    }

    this.remoteRequest = this.fetchRemoteKnowledge().finally(() => {
      this.remoteRequest = null;
    });

    return this.remoteRequest;
  }

  private async fetchRemoteKnowledge(): Promise<EditorialKnowledgeArtifact> {
    if (!this.r2Config || !this.s3Client) {
      throw new Error('R2 chat knowledge is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.r2Config.bucket,
      Key: this.r2Config.objectKey,
    });

    const response = await this.withTimeout(
      this.s3Client.send(command),
      REMOTE_KNOWLEDGE_TIMEOUT_MS,
      'R2 chat knowledge request timed out',
    );
    const body = response.Body as StringBody | undefined;
    const raw = await body?.transformToString();

    if (!raw?.trim()) {
      throw new Error('R2 returned an empty chat knowledge body');
    }

    const payload = JSON.parse(raw) as unknown;
    const artifact = this.extractEditorialKnowledgeArtifact(payload);

    this.remoteCache = {
      artifact,
      expiresAt: Date.now() + this.r2Config.cacheTtlMs,
    };

    return artifact;
  }

  private async loadLocalFallbackKnowledge(): Promise<EditorialKnowledgeArtifact | null> {
    const filePath = await resolveExistingEditorialKnowledgePath();
    if (!filePath) {
      if (!this.localArtifactMissingLogged) {
        this.logger.warn(
          'Local fallback chat knowledge artifact not found on filesystem.',
        );
        this.localArtifactMissingLogged = true;
      }

      return null;
    }

    try {
      const stats = await fs.stat(filePath);
      if (
        this.localCache &&
        this.localCache.filePath === filePath &&
        this.localCache.mtimeMs === stats.mtimeMs
      ) {
        return this.localCache.artifact;
      }

      const raw = await fs.readFile(filePath, 'utf8');
      const payload = JSON.parse(raw) as unknown;
      const artifact = this.extractEditorialKnowledgeArtifact(payload);

      this.localCache = {
        filePath,
        mtimeMs: stats.mtimeMs,
        artifact,
      };
      this.localArtifactMissingLogged = false;

      return artifact;
    } catch (error) {
      this.logger.warn(
        `Failed to load local fallback chat knowledge from "${filePath}": ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    }
  }

  private extractEditorialKnowledgeArtifact(
    payload: unknown,
  ): EditorialKnowledgeArtifact {
    if (this.isPublishedEnvelope(payload)) {
      return payload.knowledge;
    }

    if (this.isEditorialArtifact(payload)) {
      return payload;
    }

    throw new Error('Invalid chat knowledge payload shape');
  }

  private isPublishedEnvelope(
    payload: unknown,
  ): payload is PublishedEditorialKnowledgeEnvelope {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }

    const candidate = payload as Record<string, unknown>;

    return (
      candidate.version === 1 &&
      typeof candidate.generatedAt === 'string' &&
      typeof candidate.contentHash === 'string' &&
      this.isEnvelopeSource(candidate.source) &&
      this.isEditorialArtifact(candidate.knowledge)
    );
  }

  private isEnvelopeSource(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      typeof candidate.repository === 'string' &&
      typeof candidate.artifactPath === 'string'
    );
  }

  private isEditorialArtifact(
    payload: unknown,
  ): payload is EditorialKnowledgeArtifact {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    const hasKnowledgeCollections =
      candidate.projects !== undefined || candidate.posts !== undefined;

    return (
      typeof candidate.generatedAt === 'string' &&
      hasKnowledgeCollections &&
      this.isProjectEntries(candidate.projects) &&
      this.isPostEntries(candidate.posts)
    );
  }

  private isProjectEntries(value: unknown): boolean {
    return (
      value === undefined ||
      (Array.isArray(value) &&
        value.every((entry) => this.isProjectEntry(entry)))
    );
  }

  private isPostEntries(value: unknown): boolean {
    return (
      value === undefined ||
      (Array.isArray(value) && value.every((entry) => this.isPostEntry(entry)))
    );
  }

  private isProjectEntry(value: unknown): value is EditorialProjectEntry {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      typeof candidate.slug === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.excerpt === 'string' &&
      this.isStringArray(candidate.stack) &&
      this.isKnowledgeLinks(candidate.links) &&
      this.isStringArray(candidate.highlights) &&
      (candidate.searchText === undefined ||
        typeof candidate.searchText === 'string')
    );
  }

  private isPostEntry(value: unknown): value is EditorialPostEntry {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      typeof candidate.slug === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.excerpt === 'string' &&
      typeof candidate.date === 'string' &&
      this.isStringArray(candidate.tags) &&
      (candidate.canonicalUrl === undefined ||
        typeof candidate.canonicalUrl === 'string') &&
      (candidate.summary === undefined ||
        typeof candidate.summary === 'string') &&
      (candidate.searchText === undefined ||
        typeof candidate.searchText === 'string')
    );
  }

  private isKnowledgeLinks(value: unknown): boolean {
    return (
      value === undefined ||
      (Array.isArray(value) &&
        value.every((entry) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return false;
          }

          const candidate = entry as Record<string, unknown>;

          return (
            typeof candidate.label === 'string' &&
            typeof candidate.url === 'string' &&
            (candidate.icon === undefined || typeof candidate.icon === 'string')
          );
        }))
    );
  }

  private isStringArray(value: unknown): boolean {
    return (
      value === undefined ||
      (Array.isArray(value) &&
        value.every((entry) => typeof entry === 'string'))
    );
  }

  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);

      timer.unref?.();

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }
}
