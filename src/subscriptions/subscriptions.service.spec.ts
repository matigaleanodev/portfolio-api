import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(async () => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'PORTFOLIO_CLOUD_API_URL') {
                return 'https://cloud.example.com/base/';
              }

              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(SubscriptionsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates subscribe to portfolio-cloud', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          message: 'Subscribed successfully',
          email: 'test@example.com',
        }),
    } as Response);

    await expect(
      service.subscribe({ email: 'test@example.com' }),
    ).resolves.toEqual({
      message: 'Subscribed successfully',
      email: 'test@example.com',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://cloud.example.com/base/subscriptions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      }),
    );
  });

  it('delegates unsubscribe to portfolio-cloud', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          message: 'Already unsubscribed',
        }),
    } as Response);

    await expect(
      service.unsubscribe({ email: 'test@example.com' }),
    ).resolves.toEqual({
      message: 'Already unsubscribed',
      email: undefined,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://cloud.example.com/base/subscriptions',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ email: 'test@example.com' }),
      }),
    );
  });

  it('maps upstream 4xx responses to bad request', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: 'Invalid email',
        }),
    } as Response);

    await expect(
      service.subscribe({ email: 'invalid' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps upstream 5xx responses to bad gateway', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: 'Internal error',
        }),
    } as Response);

    await expect(
      service.subscribe({ email: 'test@example.com' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('fails when upstream success payload is invalid', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          email: 'test@example.com',
        }),
    } as Response);

    await expect(
      service.subscribe({ email: 'test@example.com' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('maps network failures to service unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(
      service.subscribe({ email: 'test@example.com' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
