import { Logger } from '@nestjs/common';
import { recordChatMetric } from './chat-metrics';

describe('Métricas del chat', () => {
  afterEach(() => jest.restoreAllMocks());

  it('registra solo campos permitidos, incluso ante datos extra en tiempo de ejecución', () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const metric = {
      event: 'chat_provider' as const,
      outcome: 'success' as const,
      durationMs: 12.4,
      inputTokens: 100,
      outputTokens: 40,
      cachedInputTokens: 0,
      message: 'texto privado',
      sessionId: 'visitante',
      history: ['privado'],
    };
    recordChatMetric(metric);
    expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual({
      event: 'chat_provider',
      outcome: 'success',
      durationMs: 12,
      inputTokens: 100,
      outputTokens: 40,
      cachedInputTokens: 0,
    });
  });

  it('omite consumos inválidos en lugar de producir métricas engañosas', () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    recordChatMetric({
      event: 'chat_provider',
      outcome: 'http_error',
      durationMs: 5,
      inputTokens: NaN,
      outputTokens: -1,
    });
    expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual({
      event: 'chat_provider',
      outcome: 'http_error',
      durationMs: 5,
    });
  });
});
