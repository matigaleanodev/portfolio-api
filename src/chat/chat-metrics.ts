import { Logger } from '@nestjs/common';

export type ChatProviderOutcome =
  | 'success'
  | 'cache_hit'
  | 'disabled'
  | 'empty_context'
  | 'http_error'
  | 'invalid_response'
  | 'timeout'
  | 'network_error';
type ChatMetric =
  | {
      event: 'chat_reply';
      outcome: 'faq' | 'ai' | 'fallback' | 'out_of_scope' | 'error';
      durationMs: number;
    }
  | {
      event: 'chat_knowledge';
      outcome: 'curated' | 'editorial' | 'error';
      durationMs: number;
    }
  | {
      event: 'chat_provider';
      outcome: ChatProviderOutcome;
      durationMs: number;
      inputTokens?: number;
      outputTokens?: number;
      cachedInputTokens?: number;
    };

const logger = new Logger('ChatMetrics');

/** Eventos acotados para agregación en logs, sin texto, identidad ni etiquetas del visitante. */
export function recordChatMetric(metric: ChatMetric): void {
  const entry: Record<string, string | number> = {
    event: metric.event,
    outcome: metric.outcome,
    durationMs: Math.max(0, Math.round(metric.durationMs)),
  };
  if (metric.event === 'chat_provider') {
    for (const key of [
      'inputTokens',
      'outputTokens',
      'cachedInputTokens',
    ] as const) {
      const value = metric[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
        entry[key] = value;
    }
  }
  logger.log(JSON.stringify(entry));
}
