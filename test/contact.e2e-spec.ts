import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ContactController } from '../src/contact/contact.controller';
import { ContactService } from '../src/contact/contact.service';

describe('ContactController (e2e)', () => {
  let app: INestApplication;

  const contactServiceMock = {
    send: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [{ provide: ContactService, useValue: contactServiceMock }],
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

  it('POST /api/contact accepts a valid contact message', () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/contact')
      .send({
        name: 'Matias Galeano',
        email: 'matias@example.com',
        message: 'Hola Matias, queria hablar sobre una oportunidad laboral.',
      })
      .expect(204)
      .expect(() => {
        expect(contactServiceMock.send).toHaveBeenCalledWith({
          name: 'Matias Galeano',
          email: 'matias@example.com',
          message: 'Hola Matias, queria hablar sobre una oportunidad laboral.',
        });
      });
  });

  it('POST /api/contact ignores honeypot payloads and still returns no content', () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/contact')
      .send({
        name: 'Matias Galeano',
        email: 'matias@example.com',
        message: 'Hola Matias, queria hablar sobre una oportunidad laboral.',
        company: 'ACME',
      })
      .expect(204)
      .expect(() => {
        expect(contactServiceMock.send).not.toHaveBeenCalled();
      });
  });

  it('POST /api/contact rejects invalid payloads', () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .post('/api/contact')
      .send({
        name: 'M',
        email: 'invalid-email',
        message: 'corto',
      })
      .expect(400);
  });
});
