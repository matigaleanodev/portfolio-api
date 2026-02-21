import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');

    await app.init();
  });

  it('GET /api/health devuelve ok', () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];

    return request(httpServer)
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
