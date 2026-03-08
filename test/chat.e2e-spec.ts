import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ChatController } from '../src/chat/chat.controller';
import { ChatService } from '../src/chat/chat.service';

describe('ChatController (e2e)', () => {
  let app: INestApplication;

  const chatServiceMock = {
    getStarters: jest.fn(),
    reply: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: chatServiceMock }],
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/chat/starters devuelve preguntas sugeridas', () => {
    chatServiceMock.getStarters.mockResolvedValue({
      suggestedQuestions: [
        '¿Quién sos y a qué te dedicás?',
        '¿Qué tecnologías usás?',
      ],
    });

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .get('/api/chat/starters')
      .expect(200)
      .expect({
        suggestedQuestions: [
          '¿Quién sos y a qué te dedicás?',
          '¿Qué tecnologías usás?',
        ],
      });
  });

  it('POST /api/chat devuelve answer y suggestedQuestions', () => {
    chatServiceMock.reply.mockResolvedValue({
      answer: 'Sí, Foodly Notes está publicada en Play Store.',
      suggestedQuestions: [
        '¿Qué tecnologías usaste en Foodly Notes?',
        '¿Qué proyecto destacás?',
      ],
      source: 'ai',
    });

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/chat')
      .send({
        message: 'publicaste alguna app en play store?',
        sessionId: 'local-dev-session',
      })
      .expect(201)
      .expect({
        answer: 'Sí, Foodly Notes está publicada en Play Store.',
        suggestedQuestions: [
          '¿Qué tecnologías usaste en Foodly Notes?',
          '¿Qué proyecto destacás?',
        ],
        source: 'ai',
      });
  });

  it('POST /api/chat limita suggestedQuestions a 2', () => {
    chatServiceMock.reply.mockResolvedValue({
      answer: 'Respuesta',
      suggestedQuestions: ['Primera', 'Segunda'],
      source: 'ai',
    });

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/chat')
      .send({
        message: 'pregunta',
        sessionId: 'local-dev-session',
      })
      .expect(201)
      .expect({
        answer: 'Respuesta',
        suggestedQuestions: ['Primera', 'Segunda'],
        source: 'ai',
      });
  });

  it('POST /api/chat valida request inválido', () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/chat')
      .send({
        message: 123,
      })
      .expect(400);
  });
});
