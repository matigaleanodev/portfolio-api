import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_CHAT_KNOWLEDGE_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CHAT_KNOWLEDGE_OBJECT_KEY = 'artifacts/chat/knowledge.json';

export type ChatKnowledgeR2Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  objectKey: string;
  cacheTtlMs: number;
};

export function parseCorsOrigins(
  value: string | undefined,
): string[] | boolean {
  const normalized = value?.trim();

  if (!normalized) {
    return false;
  }

  if (normalized === '*') {
    return true;
  }

  const origins = normalized
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : false;
}

export function parseTrustProxy(value: string | undefined): boolean | number {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized === 'false' || normalized === '0') {
    return false;
  }

  if (normalized === 'true') {
    return true;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return false;
  }

  return parsed;
}

export function getEditorialKnowledgeCandidatePaths(
  cwd = process.cwd(),
): string[] {
  return [
    path.resolve(cwd, '.generated', 'chat', 'knowledge.json'),
    path.resolve(
      cwd,
      '..',
      'portfolio',
      '.generated',
      'chat',
      'knowledge.json',
    ),
  ];
}

export function getPrimaryEditorialKnowledgePath(cwd = process.cwd()): string {
  return path.resolve(cwd, '.generated', 'chat', 'knowledge.json');
}

export function getChatKnowledgeCacheTtlMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const rawValue = env.CHAT_KNOWLEDGE_CACHE_TTL_MS?.trim();

  if (!rawValue) {
    return DEFAULT_CHAT_KNOWLEDGE_CACHE_TTL_MS;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isNaN(parsed) || parsed < 1_000) {
    return DEFAULT_CHAT_KNOWLEDGE_CACHE_TTL_MS;
  }

  return parsed;
}

export function getChatKnowledgeObjectKey(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const rawValue = env.CHAT_KNOWLEDGE_OBJECT_KEY?.trim();

  return rawValue || DEFAULT_CHAT_KNOWLEDGE_OBJECT_KEY;
}

export function getChatKnowledgeR2Config(
  env: NodeJS.ProcessEnv = process.env,
): ChatKnowledgeR2Config | null {
  const values = {
    endpoint: env.R2_ENDPOINT?.trim(),
    bucket: env.R2_BUCKET?.trim(),
    accessKeyId: env.R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY?.trim(),
  };

  const configuredEntries = Object.entries(values).filter(([, value]) => value);

  if (configuredEntries.length === 0) {
    return null;
  }

  const missingKeys = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key.toUpperCase());

  if (missingKeys.length > 0) {
    throw new Error(
      `Incomplete R2 chat knowledge configuration: ${missingKeys.join(', ')}`,
    );
  }

  return {
    endpoint: values.endpoint as string,
    region: env.R2_REGION?.trim() || 'auto',
    bucket: values.bucket as string,
    accessKeyId: values.accessKeyId as string,
    secretAccessKey: values.secretAccessKey as string,
    objectKey: getChatKnowledgeObjectKey(env),
    cacheTtlMs: getChatKnowledgeCacheTtlMs(env),
  };
}

export function getMissingRequiredEnv(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const requiredKeys = [
    'RESEND_API_KEY',
    'CONTACT_FROM_EMAIL',
    'CONTACT_TO_EMAIL',
    'PORTFOLIO_CLOUD_API_URL',
  ] as const;

  return requiredKeys.filter((key) => !env[key]?.trim());
}

export function getPortfolioCloudApiBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const rawValue = env.PORTFOLIO_CLOUD_API_URL?.trim();

  if (!rawValue) {
    throw new Error(
      'Missing required environment variable: PORTFOLIO_CLOUD_API_URL',
    );
  }

  return rawValue.replace(/\/+$/, '');
}

export async function resolveExistingEditorialKnowledgePath(
  cwd = process.cwd(),
): Promise<string | null> {
  for (const candidatePath of getEditorialKnowledgeCandidatePaths(cwd)) {
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {
      continue;
    }
  }

  return null;
}

export async function validateRuntimeConfiguration(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): Promise<void> {
  const missingEnv = getMissingRequiredEnv(env);
  if (missingEnv.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnv.join(', ')}`,
    );
  }

  const normalizedNodeEnv = env.NODE_ENV?.trim().toLowerCase();
  if (normalizedNodeEnv !== 'production') {
    return;
  }

  if (getChatKnowledgeR2Config(env)) {
    return;
  }

  const productionArtifactPath = getPrimaryEditorialKnowledgePath(cwd);
  try {
    await fs.access(productionArtifactPath);
  } catch {
    throw new Error(
      `Missing required editorial knowledge artifact for production: ${productionArtifactPath}`,
    );
  }
}
