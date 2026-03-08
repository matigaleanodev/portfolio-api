import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { ChatModule } from '../src/chat/chat.module';

describe('Chat runtime (e2e)', () => {
  let app: INestApplication;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    delete process.env.OPENAI_API_KEY;
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_REGION;
    delete process.env.R2_BUCKET;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.CHAT_KNOWLEDGE_OBJECT_KEY;
    delete process.env.CHAT_KNOWLEDGE_CACHE_TTL_MS;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 60_000,
            limit: 60,
          },
        ]),
        ChatModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    process.env = originalEnv;
    await app.close();
  });

  it('POST /api/chat usa el knowledge real desde el fallback local cuando no hay R2 ni OpenAI', async () => {
    const cwdPath = await writeKnowledgeArtifact({
      generatedAt: new Date().toISOString(),
      projects: [
        {
          slug: 'foodly-notes',
          title: 'Foodly Notes',
          excerpt: 'Foodly Notes está publicada en Play Store.',
          stack: ['Angular', 'Ionic', 'NestJS'],
          links: [
            {
              label: 'Play Store',
              url: 'https://play.google.com/store/apps/details?id=io.example',
            },
          ],
          highlights: ['Proyecto publicado en Play Store.'],
          searchText: 'foodly notes play store angular ionic nestjs',
        },
      ],
      posts: [],
    });
    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(cwdPath);
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    await request(httpServer)
      .post('/api/chat')
      .send({
        message: 'publicaste alguna app en play store?',
        sessionId: 'runtime-e2e',
      })
      .expect(201)
      .expect(({ body }: { body: { answer: string; source: string } }) => {
        expect(body.source).toBe('fallback');
        expect(body.answer).toContain('Según el portfolio');
        expect(body.answer).toContain('Play Store');
      });

    cwdSpy.mockRestore();
  });
});

async function writeKnowledgeArtifact(
  payload: Record<string, unknown>,
): Promise<string> {
  const directoryPath = await fs.mkdtemp(
    path.join(os.tmpdir(), 'portfolio-chat-runtime-'),
  );
  const generatedPath = path.join(directoryPath, '.generated', 'chat');
  await fs.mkdir(generatedPath, { recursive: true });
  const filePath = path.join(generatedPath, 'knowledge.json');
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return directoryPath;
}
