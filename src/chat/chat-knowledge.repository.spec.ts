import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ChatKnowledgeRepository } from './chat-knowledge.repository';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: sendMock,
  })),
  GetObjectCommand: jest
    .fn()
    .mockImplementation((input: { Bucket: string; Key: string }) => ({
      input,
    })),
}));

describe('ChatKnowledgeRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('reads the knowledge envelope from R2 when configured', async () => {
    sendMock.mockResolvedValue({
      Body: {
        transformToString: jest
          .fn()
          .mockResolvedValue(JSON.stringify(buildEnvelope())),
      },
    });

    const repository = createRepository({
      R2_ENDPOINT: 'https://r2.example.com',
      R2_BUCKET: 'portfolio-media',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
    });

    const result = await repository.getKnowledge();

    expect(result.projects?.[0]?.slug).toBe('foodly-notes');
    expect(S3Client).toHaveBeenCalledTimes(1);
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'portfolio-media',
      Key: 'artifacts/chat/knowledge.json',
    });
  });

  it('reuses the in-memory cache before the ttl expires', async () => {
    sendMock.mockResolvedValue({
      Body: {
        transformToString: jest
          .fn()
          .mockResolvedValue(JSON.stringify(buildEnvelope())),
      },
    });

    const repository = createRepository({
      R2_ENDPOINT: 'https://r2.example.com',
      R2_BUCKET: 'portfolio-media',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      CHAT_KNOWLEDGE_CACHE_TTL_MS: '60000',
    });

    await repository.getKnowledge();
    await repository.getKnowledge();

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the local artifact when R2 fails', async () => {
    sendMock.mockRejectedValue(new Error('r2 unavailable'));
    const cwdPath = await writeKnowledgeArtifact({
      generatedAt: new Date().toISOString(),
      projects: [
        {
          slug: 'modo-playa',
          title: 'Modo Playa',
          excerpt: 'Fallback local artifact.',
        },
      ],
      posts: [],
    });

    jest.spyOn(process, 'cwd').mockReturnValue(cwdPath);

    const repository = createRepository({
      R2_ENDPOINT: 'https://r2.example.com',
      R2_BUCKET: 'portfolio-media',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
    });

    const result = await repository.getKnowledge();

    expect(result.projects?.[0]?.slug).toBe('modo-playa');
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid payloads when neither R2 nor local fallback is valid', async () => {
    sendMock.mockResolvedValue({
      Body: {
        transformToString: jest
          .fn()
          .mockResolvedValue(JSON.stringify({ invalid: true })),
      },
    });

    const cwdPath = await fs.mkdtemp(
      path.join(os.tmpdir(), 'portfolio-chat-no-artifact-'),
    );
    jest.spyOn(process, 'cwd').mockReturnValue(cwdPath);

    const repository = createRepository({
      R2_ENDPOINT: 'https://r2.example.com',
      R2_BUCKET: 'portfolio-media',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
    });

    await expect(repository.getKnowledge()).rejects.toThrow(
      'Chat knowledge is unavailable',
    );
  });
});

function createRepository(
  values: Partial<Record<string, string>>,
): ChatKnowledgeRepository {
  const configService = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;

  return new ChatKnowledgeRepository(configService);
}

function buildEnvelope(): Record<string, unknown> {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      repository: 'portfolio',
      artifactPath: '.generated/chat/knowledge.json',
    },
    contentHash: 'sha256:test',
    knowledge: {
      generatedAt: new Date().toISOString(),
      projects: [
        {
          slug: 'foodly-notes',
          title: 'Foodly Notes',
          excerpt: 'App de recetas publicada en Google Play Store.',
        },
      ],
      posts: [],
    },
  };
}

async function writeKnowledgeArtifact(
  payload: Record<string, unknown>,
): Promise<string> {
  const directoryPath = await fs.mkdtemp(
    path.join(os.tmpdir(), 'portfolio-chat-knowledge-'),
  );
  const generatedPath = path.join(directoryPath, '.generated', 'chat');
  await fs.mkdir(generatedPath, { recursive: true });
  const filePath = path.join(generatedPath, 'knowledge.json');
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return directoryPath;
}
