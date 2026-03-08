import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SubscriptionsController } from '../src/subscriptions/subscriptions.controller';
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service';

type ErrorBody = {
  message: string;
};

describe('SubscriptionsController (e2e)', () => {
  let app: INestApplication;

  const subscriptionsServiceMock = {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: subscriptionsServiceMock,
        },
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/subscriptions subscribes a valid email', () => {
    subscriptionsServiceMock.subscribe.mockResolvedValue({
      message: 'Subscribed successfully',
      email: 'test@example.com',
    });

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/subscriptions')
      .send({
        email: 'Test@Example.com ',
      })
      .expect(200)
      .expect({
        message: 'Subscribed successfully',
        email: 'test@example.com',
      });
  });

  it('DELETE /api/subscriptions unsubscribes a valid email', () => {
    subscriptionsServiceMock.unsubscribe.mockResolvedValue({
      message: 'Unsubscribed successfully',
      email: 'test@example.com',
    });

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .delete('/api/subscriptions')
      .send({
        email: 'test@example.com',
      })
      .expect(200)
      .expect({
        message: 'Unsubscribed successfully',
        email: 'test@example.com',
      });
  });

  it('validates invalid subscription payloads', () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/subscriptions')
      .send({
        email: 'invalid-email',
      })
      .expect(400);
  });

  it('maps upstream validation errors to bad request responses', () => {
    subscriptionsServiceMock.subscribe.mockRejectedValue(
      new BadRequestException('Invalid email'),
    );

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/subscriptions')
      .send({
        email: 'test@example.com',
      })
      .expect(400)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.message).toBe('Invalid email');
      });
  });

  it('maps upstream gateway failures to bad gateway responses', () => {
    subscriptionsServiceMock.unsubscribe.mockRejectedValue(
      new BadGatewayException(
        'No se pudo procesar la suscripcion en este momento.',
      ),
    );

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .delete('/api/subscriptions')
      .send({
        email: 'test@example.com',
      })
      .expect(502)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.message).toBe(
          'No se pudo procesar la suscripcion en este momento.',
        );
      });
  });

  it('maps upstream availability failures to service unavailable responses', () => {
    subscriptionsServiceMock.subscribe.mockRejectedValue(
      new ServiceUnavailableException(
        'No se pudo conectar con el servicio de suscripciones.',
      ),
    );

    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/subscriptions')
      .send({
        email: 'test@example.com',
      })
      .expect(503)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.message).toBe(
          'No se pudo conectar con el servicio de suscripciones.',
        );
      });
  });
});
