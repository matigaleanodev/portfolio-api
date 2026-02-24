import { Injectable, Logger } from '@nestjs/common';
import { ChatCompletionPayload, ChatCompletionResult } from './chat.types';

@Injectable()
export class OpenAiService {
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000;
  private readonly maxCacheEntries = 200;
  private readonly logger = new Logger(OpenAiService.name);
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4.1-mini';
  private readonly responseCache = new Map<
    string,
    { value: ChatCompletionResult; expiresAt: number }
  >();

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async generateChatResponse(
    payload: ChatCompletionPayload,
  ): Promise<ChatCompletionResult | null> {
    if (payload.contextItems.length === 0) {
      return null;
    }

    if (!this.apiKey) {
      return null;
    }

    const cacheKey = this.buildCacheKey(payload);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    const systemPrompt = [
      'Sos el asistente de un portfolio personal.',
      'Respondé SOLO con la información provista en el contexto.',
      'No mezcles contextos entre proyectos o fuentes distintas.',
      'Si una pregunta refiere a un proyecto, respondé solo con el contexto de ese proyecto.',
      'No combines datos de Foodly Notes con Modo Playa, ni con otros proyectos, salvo que la pregunta compare explícitamente proyectos.',
      'Podés reformular la explicación, pero no alterar ni cruzar datos entre contextos.',
      'Si no hay información suficiente, indicá claramente que no está disponible en el portfolio.',
      'Respondé en español.',
      'Devolvé JSON válido con este formato:',
      '{"answer":"string","suggestedQuestions":["q1","q2","q3","q4"]}',
      'Las suggestedQuestions deben ser 3 o 4 preguntas cortas y relevantes.',
      'No inventes tecnologías, trabajos ni proyectos.',
    ].join('\n');

    const contextText = payload.contextItems
      .map(
        (item, index) =>
          `[${index + 1}] ${item.sourceType} | ${item.title}\n${item.text}${
            item.tags?.length ? `\nTags: ${item.tags.join(', ')}` : ''
          }`,
      )
      .join('\n\n');

    const userPrompt = [
      `Pregunta del usuario: ${payload.userMessage}`,
      '',
      'Contexto del portfolio:',
      contextText,
      '',
      payload.suggestedSeedQuestions?.length
        ? `Preguntas sugeridas candidatas (opcional): ${payload.suggestedSeedQuestions.join(' | ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          max_output_tokens: 300,
          text: { format: { type: 'json_object' } },
          input: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI error ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        output?: Array<{ content?: Array<{ text?: string }> }>;
      };
      const rawContent = data.output?.[0]?.content?.[0]?.text;
      if (!rawContent) {
        return null;
      }

      const parsed = JSON.parse(rawContent) as Partial<ChatCompletionResult>;
      if (
        typeof parsed.answer !== 'string' ||
        !Array.isArray(parsed.suggestedQuestions)
      ) {
        return null;
      }

      const suggestedQuestions = parsed.suggestedQuestions
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 4);

      const result = {
        answer: parsed.answer.trim(),
        suggestedQuestions,
      };

      this.setCachedResponse(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.warn(
        `OpenAI request failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildCacheKey(payload: ChatCompletionPayload): string {
    const normalizedMessage = this.normalizeCachePart(payload.userMessage);
    const normalizedContext = payload.contextItems
      .map((item) =>
        [
          this.normalizeCachePart(item.sourceType),
          this.normalizeCachePart(item.sourceId ?? ''),
          this.normalizeCachePart(item.title),
          this.normalizeCachePart(item.text),
          (item.tags ?? [])
            .map((tag) => this.normalizeCachePart(tag))
            .join('|'),
        ].join('::'),
      )
      .join('||');

    const contextHash = this.hashString(normalizedContext);
    return `${normalizedMessage}::${contextHash}`;
  }

  private normalizeCachePart(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private hashString(value: string): string {
    let hash = 2166136261;

    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16);
  }

  private getCachedResponse(key: string): ChatCompletionResult | null {
    const cached = this.responseCache.get(key);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.responseCache.delete(key);
      return null;
    }

    return cached.value;
  }

  private setCachedResponse(key: string, value: ChatCompletionResult): void {
    if (this.responseCache.has(key)) {
      this.responseCache.delete(key);
    }

    this.responseCache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    while (this.responseCache.size > this.maxCacheEntries) {
      const iteratorResult = this.responseCache.keys().next();
      if (iteratorResult.done) {
        break;
      }
      this.responseCache.delete(iteratorResult.value);
    }
  }
}
