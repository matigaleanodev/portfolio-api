import fs from 'node:fs/promises';
import path from 'node:path';

export function parseCorsOrigins(value: string | undefined): string[] | boolean {
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
    path.resolve(cwd, '..', 'portfolio', '.generated', 'chat', 'knowledge.json'),
  ];
}

export function getPrimaryEditorialKnowledgePath(cwd = process.cwd()): string {
  return path.resolve(cwd, '.generated', 'chat', 'knowledge.json');
}

export function getMissingRequiredEnv(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const requiredKeys = [
    'RESEND_API_KEY',
    'CONTACT_FROM_EMAIL',
    'CONTACT_TO_EMAIL',
  ] as const;

  return requiredKeys.filter((key) => !env[key]?.trim());
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

  const productionArtifactPath = getPrimaryEditorialKnowledgePath(cwd);
  try {
    await fs.access(productionArtifactPath);
  } catch {
    throw new Error(
      `Missing required editorial knowledge artifact for production: ${productionArtifactPath}`,
    );
  }
}
