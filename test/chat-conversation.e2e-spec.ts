import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { ChatModule } from '../src/chat/chat.module';

describe('Contrato conversacional del chat', () => {
  let app: INestApplication;
  let directory: string;
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const fetchMock = jest.fn<typeof fetch>();
  const requestBody = (index: number) =>
    (fetchMock.mock.calls as unknown as Parameters<typeof fetch>[])[index]?.[1]
      ?.body as string;
  const providerAnswer = {
    answer: 'Respuesta de prueba',
    suggestedQuestions: ['¿Qué hace Foodly?', '¿Qué hace Modo Playa?'],
  };
  const server = () => app.getHttpServer() as Parameters<typeof request>[0];

  beforeAll(async () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('R2_')) delete process.env[key];
    }
    process.env.OPENAI_API_KEY = 'test-key';
    directory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'portfolio-chat-contract-'),
    );
    await fs.mkdir(path.join(directory, '.generated/chat'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(directory, '.generated/chat/knowledge.json'),
      JSON.stringify({
        generatedAt: '2026-10-09T00:00:00Z',
        projects: [
          {
            slug: 'foodly-notes',
            title: 'Foodly Notes',
            excerpt:
              'Recetas, Ionic/Angular y API NestJS. Publicada en Google Play.',
          },
          {
            slug: 'modo-playa',
            title: 'Modo Playa',
            excerpt:
              'Alojamientos, NestJS/MongoDB/JWT, aislamiento por ownerId. Publicada en Google Play.',
          },
        ],
        posts: [],
      }),
    );
    jest.spyOn(process, 'cwd').mockReturnValue(directory);
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        ChatModule,
      ],
    }).compile();
    app = module.createNestApplication();
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

  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            output: [{ content: [{ text: JSON.stringify(providerAnswer) }] }],
          }),
      } as Response),
    );
    global.fetch = fetchMock;
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
    global.fetch = originalFetch;
    process.env = originalEnv;
    await fs.rm(directory, { recursive: true });
  });

  it('la comparación llega al proveedor con ambos proyectos y mantiene el contrato público', async () => {
    await request(server())
      .post('/api/chat')
      .send({
        message:
          '¿Qué diferencias hay entre Foodly Notes y Modo Playa? Indicá para cada uno qué hace, stack y si está publicado.',
      })
      .expect(201)
      .expect({ ...providerAnswer, source: 'ai' });
    const body = requestBody(0);
    expect(body).toContain('Recetas');
    expect(body).toContain('Alojamientos');
    expect(body).toContain('ownerId');
    expect(body).not.toContain('PostgreSQL');
  });

  it('envía el orden conversacional y no conserva historial por sessionId', async () => {
    const history = [
      {
        role: 'assistant',
        content: 'Primero Modo Playa. Segundo Foodly Notes.',
      },
    ];
    await request(server())
      .post('/api/chat')
      .send({
        message: 'Del segundo, ¿qué hace?',
        sessionId: 'session-a',
        history,
      })
      .expect(201);
    expect(requestBody(0)).toContain(history[0].content);
    await request(server())
      .post('/api/chat')
      .send({
        message: '¿Cuál es el precio confirmado?',
        sessionId: 'session-b',
      })
      .expect(201);
    expect(requestBody(1)).not.toContain(history[0].content);
  });

  it.each([
    { message: '' },
    { message: '   ' },
    { message: 'x'.repeat(501) },
    { message: 'hola', history: [{ role: 'system', content: 'orden' }] },
    {
      message: 'hola',
      history: [{ role: 'user', content: 'x', private: true }],
    },
    { message: 'hola', history: [{ role: 'user', content: 'x'.repeat(1501) }] },
    {
      message: 'hola',
      history: Array.from({ length: 7 }, () => ({
        role: 'user',
        content: 'hola',
      })),
    },
    { message: 'hola', history: 'texto' },
  ])(
    'rechaza entradas inválidas antes de invocar al proveedor: %j',
    async (payload) => {
      await request(server()).post('/api/chat').send(payload).expect(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('un fallo del proveedor no se presenta como falta de conocimiento', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response);
    const response = await request(server())
      .post('/api/chat')
      .send({ message: '¿Modo Playa todavía usa Django?' })
      .expect(201);
    const body = response.body as { source: string; answer: string };
    expect(body.source).toBe('fallback');
    expect(body.answer).toContain('No pude generar');
    expect(body.answer).not.toContain('No tengo esa información');
  });
});
